import { canReadConnector, canWriteConnector } from './connectors.js';

export const connectorStatus = (connector, t = (value) => value) =>
  t(
    connector.legacy
      ? '历史来源待确认'
      : !connector.enabled
        ? '已停用'
        : {
            connected: canWriteConnector(connector) ? '模拟读写就绪' : '模拟可读取',
            disconnected: '等待检测',
            error: '模拟检测未通过',
            unconfigured: '待配置',
          }[connector.status] || '待核查',
  );
export const connectorReadable = canReadConnector;
export const connectorWritable = canWriteConnector;
