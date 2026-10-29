//! Versioned diagnostic wire contracts. No business API is exposed yet.
use serde::{Deserialize, Serialize};

pub const PROTOCOL_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(feature = "type-export", derive(ts_rs::TS))]
#[serde(rename_all = "camelCase")]
pub struct CoreHealth {
    pub service: String,
    pub version: String,
    pub protocol_version: u32,
    pub mode: String,
    pub capabilities: Vec<String>,
}

impl CoreHealth {
    pub fn foundation(version: &str) -> Self {
        Self {
            service: "reed-core".into(),
            version: version.into(),
            protocol_version: PROTOCOL_VERSION,
            mode: "foundation".into(),
            capabilities: Vec::new(),
        }
    }
}
