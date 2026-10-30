import { useWorkbenchRuntime } from './runtime-context.js';
import { useI18n } from './i18n.jsx';
import { Select } from './Select.jsx';
import { useState } from 'react';
import { Info, Plugs } from '@phosphor-icons/react';

import { Modal } from './ui.jsx';

export function ImportDialog({ ctx, close }) {
  const { connectorReadable, connectorStatus, getOriginInfo, WORK_ITEM_TYPES } =
    useWorkbenchRuntime().services;
  const { t } = useI18n();
  const { model, modal, act, openTask } = ctx;
  const initial =
    model.connectors.find((item) => item.id === modal.connectorId) ||
    model.connectors.find(connectorReadable) ||
    model.connectors[0];
  const [connectorId, setConnectorId] = useState(initial?.id || ''),
    [project, setProject] = useState(initial?.projects[0] || ''),
    [error, setError] = useState('');
  const connector = model.connectors.find((item) => item.id === connectorId);
  const ready = connectorReadable(connector) && connector.projects.includes(project);
  const samples =
    connector?.workItemType === 'bug'
      ? [
          { id: 'BUG-120', title: '修复列表状态筛选失效' },
          { id: 'BUG-121', title: '修复导入失败原因缺失' },
        ]
      : connector?.workItemType === 'task'
        ? [
            { id: 'TASK-320', title: '补充成员接口自动化测试' },
            { id: 'TASK-321', title: '整理工作台操作文档' },
          ]
        : [
            { id: 'REQ-1042', title: '成员导入失败后自动补偿' },
            { id: 'REQ-1050', title: '新增成员批量停用与恢复' },
            { id: 'REQ-1051', title: '导入结果支持下载失败清单' },
          ];
  return (
    <Modal title={t('从连接器导入工作项')} close={close} wide>
      <div className="modal-body">
        <div className="notice subtle">
          <Info size={20} />
          <span>
            {t('浏览演示来源')}
            <small>{t('项目、工作项和连接测试均为本地模拟；不读取或修改真实云效。')}</small>
          </span>
        </div>
        <div className="form-row import-source-fields">
          <label className="field">
            {t('连接器')}
            <Select
              aria-label={t('导入连接器')}
              searchable
              searchPlaceholder={t('搜索连接…')}
              value={connectorId}
              onChange={(event) => {
                const next = model.connectors.find((item) => item.id === event.target.value);
                setConnectorId(next.id);
                setProject(next.projects[0] || '');
                setError('');
              }}
            >
              {model.connectors.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                  data-icon="yunxiao"
                  data-description={connectorStatus(item, t)}
                >
                  {
                    getOriginInfo(model, { origin: { kind: 'connector', connectorId: item.id } }, t)
                      .label
                  }
                </option>
              ))}
            </Select>
          </label>
          <label className="field">
            {t('项目')}
            <Select
              aria-label={t('导入项目')}
              value={project}
              onChange={(event) => setProject(event.target.value)}
            >
              <option value="" disabled>
                {t('选择项目')}
              </option>
              {connector?.projects.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </Select>
          </label>
        </div>
        {!ready ? (
          <div className="notice">
            <Plugs size={21} />
            <span>
              {t('来源暂不可导入')}
              <small>{connector ? connectorStatus(connector, t) : t('请先添加连接器')}</small>
            </span>
            <button className="secondary" onClick={() => ctx.openConnectors(connectorId)}>
              {t('配置连接器')}
            </button>
          </div>
        ) : (
          <p className="import-source-caption">
            {t('本次来源：')}
            <strong>{connector.name}</strong> · {project} ·{' '}
            {t(WORK_ITEM_TYPES.find((item) => item.id === connector.workItemType)?.label)}
          </p>
        )}
        {error && (
          <p className="scope-note" role="alert">
            {t(error)}
          </p>
        )}
        <div className="import-list">
          {samples.map((item) => {
            const exists = model.tasks.find(
              (task) =>
                task.origin?.kind === 'connector' &&
                task.origin.connectorId === connectorId &&
                task.origin.externalId === item.id &&
                task.project === project,
            );
            return (
              <div key={item.id}>
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.id} · {connector?.name || t('未选择连接器')} ·{' '}
                    {project || t('未选择项目')}
                  </small>
                </span>
                <button
                  className={exists ? 'quiet' : 'secondary'}
                  disabled={!exists && !ready}
                  onClick={() => {
                    if (exists) {
                      close();
                      openTask(exists.id);
                      return;
                    }
                    const next = act(
                      {
                        type: 'IMPORT_TASK',
                        connectorId,
                        project,
                        externalId: item.id,
                        title: item.title,
                      },
                      t('已导入并记录准确来源'),
                      setError,
                    );
                    if (next) {
                      close();
                      openTask(next.tasks.at(-1).id);
                    }
                  }}
                >
                  {exists ? t('打开已有任务') : t('导入')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
