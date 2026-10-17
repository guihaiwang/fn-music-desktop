use std::sync::OnceLock;

use base64::Engine as _;

/// 全局 HTTP 客户端（复用连接池，15s 超时）
fn client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .expect("构建 HTTP 客户端失败")
    })
}

/// 图片响应：内容类型 + base64 编码的图片字节
#[derive(serde::Serialize)]
pub struct NasImage {
    pub content_type: String,
    pub data: String,
}

/// 通过后端拉取 NAS 图片（歌单/专辑/歌曲封面、歌手照片等静态资源，均走
/// /music/api/v1/static/cover?coverId=&size=）。
///
/// 前端 <img> 无法携带鉴权：令牌存于 localStorage，webview 对 NAS 域没有
/// music-token cookie，直连图片地址会 401。因此由 Rust 侧携带 Cookie 请求，
/// 字节以 base64 返回，前端解码为 Blob 后经 objectURL 交给 <img> 显示。
///
/// - `url`：完整图片地址（登录服务器地址 + /music/api/v1/static/cover?coverId=&size=）
/// - `token`：登录令牌（music-token）
#[tauri::command]
pub async fn fetch_nas_image(url: String, token: String) -> Result<NasImage, String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("仅支持 http/https 图片地址".into());
    }

    let resp = client()
        .get(&url)
        .header("Cookie", format!("music-token={token}"))
        .send()
        .await
        .map_err(|e| format!("图片请求失败: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("图片请求失败 (HTTP {})", resp.status().as_u16()));
    }

    let content_type = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .split(';')
        .next()
        .unwrap_or("image/jpeg")
        .trim()
        .to_string();

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("读取图片数据失败: {e}"))?;
    if bytes.is_empty() {
        return Err("图片数据为空".into());
    }

    Ok(NasImage {
        content_type,
        data: base64::engine::general_purpose::STANDARD.encode(&bytes),
    })
}
