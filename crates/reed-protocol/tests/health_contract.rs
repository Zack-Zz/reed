use reed_protocol::CoreHealth;
use serde_json::json;

#[test]
fn diagnostics_identify_foundation_without_claiming_business_ready() {
    let health = CoreHealth::foundation("0.1.0");
    assert_eq!(
        serde_json::to_value(&health).unwrap(),
        json!({"service":"reed-core","version":"0.1.0","protocolVersion":1,
               "mode":"foundation","capabilities":[]})
    );
    let decoded: CoreHealth =
        serde_json::from_value(serde_json::to_value(&health).unwrap()).unwrap();
    assert_eq!(decoded, health);
}
