use reed_protocol::{CoreHealth, PROTOCOL_VERSION};
use ts_rs::TS;

fn main() {
    println!("export const CORE_PROTOCOL_VERSION = {PROTOCOL_VERSION} as const;\n");
    println!(
        "{}",
        CoreHealth::export_to_string(&ts_rs::Config::default()).expect("export diagnostic type")
    );
}
