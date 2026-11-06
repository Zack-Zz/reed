import { useState } from 'react';
import { FolderOpen, GitBranch, FolderSimple } from '@phosphor-icons/react';
import { Modal } from './ui.jsx';
import { useI18n } from './i18n.jsx';

/** 项目目录管理弹窗：输入绝对路径或选择目录，类型由系统识别（演示为模拟判定）。 */
interface ProjectDirectoryDialogProps {
  ctx: any;
  projectId: string;
  close: () => void;
}
export function ProjectDirectoryDialog({ ctx, projectId, close }: ProjectDirectoryDialogProps) {
  const { t } = useI18n();
  const { model, act } = ctx;
  const project = model.projects.find((item: any) => item.id === projectId);
  const directories = model.directories.filter((item: any) => item.projectId === projectId);
  const [path, setPath] = useState('');
  const [error, setError] = useState('');
  // 浏览器演示不调用真实目录选择器（webkitdirectory 必弹"上传文件"确认、
  // showDirectoryPicker 必弹"查看和复制"授权），点按只模拟回填一个演示绝对路径；
  // 真实目录选择器由 Tauri 壳的原生对话框提供，届时返回真实绝对路径。
  const demoWorkspaceRoot = '/Users/demo/work/member-center';
  const demoDirectoryNames = ['backend-service', '设计资料', 'release-docs'];
  const [demoIndex, setDemoIndex] = useState(0);
  if (!project) return null;
  const submit = () => {
    const trimmed = path.trim();
    if (!trimmed) return;
    // act 契约：成功返回新状态，失败返回 null 并经 onError 保留错误；只有成功才清空输入。
    const result = act(
      { type: 'ADD_DIRECTORY', projectId, path: trimmed },
      '目录已关联',
      (message: string) => setError(message),
    );
    if (result) {
      setError('');
      setPath('');
    }
  };
  const chooseDirectory = () => {
    setError('');
    const name = demoDirectoryNames[demoIndex % demoDirectoryNames.length];
    setPath(`${demoWorkspaceRoot}/${name}`);
    setDemoIndex((index) => index + 1);
  };
  return (
    <Modal title={t('项目目录 · {name}', { name: project.name })} close={close}>
      <div className="modal-body project-directory-dialog">
        <div className="project-directory-list">
          {directories.map((directory: any) => (
            <div className="project-directory-row" key={directory.id}>
              {directory.kind === 'git' ? <GitBranch size={16} /> : <FolderSimple size={16} />}
              <span className="project-directory-main">
                <strong className="project-directory-name" title={directory.name}>
                  {directory.name}
                </strong>
                <code title={directory.path}>{directory.path}</code>
              </span>
              <small>{directory.kind === 'git' ? t('Git 工程') : t('普通目录')}</small>
            </div>
          ))}
          {!directories.length && <p className="muted">{t('尚未关联目录。')}</p>}
        </div>
        <label className="field">
          {t('关联目录')}
          <div className="project-directory-add">
            <input
              value={path}
              placeholder={t('输入本地目录绝对路径，或选择目录')}
              onChange={(event) => setPath(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && submit()}
            />
            <button
              type="button"
              className="quiet"
              onClick={chooseDirectory}
              aria-label={t('选择目录')}
            >
              <FolderOpen size={15} />
              {t('选择目录')}
            </button>
            <button type="button" className="primary small" onClick={submit}>
              {t('关联')}
            </button>
          </div>
        </label>
        <p className="footnote">
          {t('是否为 Git 工程由系统自动识别；当前为演示判定，不会读取磁盘。')}
        </p>
        {error && (
          <p className="relation-error" role="alert">
            {t(error)}
          </p>
        )}
      </div>
      <footer className="modal-actions">
        <button className="quiet" onClick={close}>
          {t('完成')}
        </button>
      </footer>
    </Modal>
  );
}
