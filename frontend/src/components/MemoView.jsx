import { useMemo, useState } from 'react'

/** 列表摘录：压缩空白并截断 */
function excerpt(text, max = 80) {
  if (text == null) return ''
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}

/** 备忘录编辑器：标题 + 正文 + 勾选本篇标注作为证据（保存时记录快照） */
function MemoEditor({ memo, codings, saving, onSave, onCancel }) {
  const editing = memo != null
  const [title, setTitle] = useState(memo?.title ?? '')
  const [body, setBody] = useState(memo?.body ?? '')
  // 关联的现存标注：编辑时以当前仍指向现存标注的证据为初始选中
  const [selected, setSelected] = useState(
    () =>
      new Set(
        (memo?.evidences ?? [])
          .filter((ev) => ev.coding_id != null)
          .map((ev) => ev.coding_id)
      )
  )
  // 指向已删除标注的历史证据：默认保留，取消勾选则保存时显式移除
  const [removedIds, setRemovedIds] = useState(() => new Set())

  const goneEvidences = useMemo(
    () => (memo?.evidences ?? []).filter((ev) => ev.coding_id == null),
    [memo]
  )

  function toggleCoding(id) {
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleGone(evidenceId) {
    setRemovedIds((cur) => {
      const next = new Set(cur)
      if (next.has(evidenceId)) next.delete(evidenceId)
      else next.add(evidenceId)
      return next
    })
  }

  function handleSave() {
    if (!title.trim() || saving) return
    onSave({
      title: title.trim(),
      body,
      coding_ids: [...selected],
      remove_evidence_ids: [...removedIds],
    })
  }

  return (
    <div className="memo-editor">
      <div className="memo-editor-title">
        {editing ? `编辑备忘录 #${memo.id}` : '新建备忘录'}
      </div>
      <input
        className="memo-title-input"
        placeholder="备忘录标题（必填）"
        maxLength={200}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        rows={6}
        placeholder="正文：记录分析思路、理论联想、待追问的问题…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="memo-ev-picker">
        <div className="memo-ev-picker-head">
          关联证据（勾选本篇文档的标注，保存时记录编码 / 区间 / 原文摘录快照）：
        </div>
        {codings.length === 0 && goneEvidences.length === 0 && (
          <div className="empty">当前文档暂无标注可关联，可先在正文中编码。</div>
        )}
        {codings.map((cg) => (
          <div className="memo-ev-option" key={cg.id}>
            <label>
              <input
                type="checkbox"
                checked={selected.has(cg.id)}
                onChange={() => toggleCoding(cg.id)}
              />
              <span className="dot" style={{ background: cg.code_color }} />
              <span className="code-name">{cg.code_name}</span>
              <code>
                [{cg.start}, {cg.end})
              </code>
              <span className="memo-ev-excerpt" title={cg.text}>
                {cg.text}
              </span>
            </label>
          </div>
        ))}
        {goneEvidences.map((ev) => (
          <div className="memo-ev-option memo-ev-gone" key={`gone-${ev.id}`}>
            <label>
              <input
                type="checkbox"
                checked={!removedIds.has(ev.id)}
                onChange={() => toggleGone(ev.id)}
              />
              <span className="dot" style={{ background: ev.code_color }} />
              <span className="code-name">{ev.code_name}</span>
              <code>
                [{ev.start}, {ev.end})
              </code>
              <span className="memo-flag memo-flag-bad">原标注已删除</span>
              <span className="memo-ev-excerpt" title={ev.excerpt}>
                {ev.excerpt}
              </span>
            </label>
          </div>
        ))}
      </div>
      <p className="hint">
        已关联的标注保留原快照，不随标注后续变化自动更新；指向已删除标注的历史证据默认保留，
        取消勾选后保存才会移除。
      </p>
      <div className="memo-editor-actions">
        <button type="button" onClick={onCancel} disabled={saving}>
          取消
        </button>
        <button
          type="button"
          className="primary-btn"
          disabled={!title.trim() || saving}
          onClick={handleSave}
        >
          {saving ? '保存中…' : editing ? '保存修改' : '创建备忘录'}
        </button>
      </div>
    </div>
  )
}

/** 单条证据：始终展示快照；已变化时附当前值对照，可定位正文 */
function MemoEvidence({ ev, onLocate }) {
  return (
    <li className={`memo-ev memo-ev-${ev.status}`}>
      <div className="memo-ev-head">
        <span className="dot" style={{ background: ev.code_color }} />
        <strong>{ev.code_name}</strong>
        <code>
          [{ev.start}, {ev.end})
        </code>
        {ev.status === 'changed' && <span className="memo-flag">已变化</span>}
        {ev.status === 'deleted' && (
          <span className="memo-flag memo-flag-bad">原标注已删除</span>
        )}
        <span className="memo-ev-time">快照于 {ev.created_at}</span>
        {ev.current && (
          <button
            type="button"
            className="link-btn"
            title="切回正文并闪烁定位该标注当前位置"
            onClick={() => onLocate(ev)}
          >
            定位正文
          </button>
        )}
      </div>
      <div className="memo-ev-text" title={ev.excerpt}>
        <mark>{ev.excerpt}</mark>
      </div>
      {ev.status === 'changed' && ev.current && (
        <div className="memo-ev-current">
          现为
          <span className="dot" style={{ background: ev.current.code_color }} />
          {ev.current.code_name}
          <code>
            [{ev.current.start}, {ev.current.end})
          </code>
          <span className="memo-ev-current-text" title={ev.current.text}>
            ：{excerpt(ev.current.text, 60)}
          </span>
        </div>
      )}
    </li>
  )
}

/**
 * 分析备忘录视图。
 *
 * 研究者为当前文档撰写带标题、正文的备忘录，并勾选本篇已有标注作为证据；
 * 保存关联时后端记录标注与原文摘录快照，标注之后被修改或删除时原证据保留，
 * 并逐条标示「已变化」（附当前值对照）或「原标注已删除」。备忘录按创建时间
 * 排序查看（最新 / 最早优先可切换），可编辑、归档与删除；归档的备忘录默认
 * 收进「已归档」筛选，可随时恢复。
 */
export default function MemoView({
  memos,
  loading,
  error,
  codings,
  onCreate,
  onUpdate,
  onArchive,
  onDelete,
  onLocate,
}) {
  const [filter, setFilter] = useState('active') // active | archived | all
  const [order, setOrder] = useState('desc') // desc=最新优先 | asc=最早优先
  const [editor, setEditor] = useState(null) // null | { memo: null=新建 | 编辑对象 }
  const [saving, setSaving] = useState(false)

  const list = memos ?? []
  const activeCount = list.filter((m) => !m.archived).length
  const archivedCount = list.length - activeCount

  const visible = useMemo(() => {
    let out = list
    if (filter === 'active') out = out.filter((m) => !m.archived)
    if (filter === 'archived') out = out.filter((m) => m.archived)
    // 后端按创建时间倒序返回，最早优先时反转
    if (order === 'asc') out = [...out].reverse()
    return out
  }, [list, filter, order])

  async function handleSave(payload) {
    setSaving(true)
    try {
      if (editor?.memo) {
        await onUpdate(editor.memo.id, payload)
      } else {
        await onCreate({
          title: payload.title,
          body: payload.body,
          coding_ids: payload.coding_ids,
        })
      }
      setEditor(null)
    } catch {
      /* 错误已由上层提示；保留编辑器内容便于修改后重试 */
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(memo) {
    if (
      window.confirm(
        `删除备忘录「${memo.title}」及其全部 ${memo.evidence_counts.total} 条证据快照？`
      )
    ) {
      onDelete(memo)
    }
  }

  return (
    <div className="memo-panel">
      <div className="memo-toolbar">
        <div className="memo-filter-bar">
          {[
            ['active', `进行中 ${activeCount}`],
            ['archived', `已归档 ${archivedCount}`],
            ['all', `全部 ${list.length}`],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={filter === key ? 'memo-filter-active' : ''}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="memo-toolbar-actions">
          <button
            type="button"
            onClick={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
            title="按创建时间切换排序"
          >
            {order === 'desc' ? '最新优先' : '最早优先'}
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={() => setEditor({ memo: null })}
            disabled={editor !== null}
          >
            ＋ 新建备忘录
          </button>
        </div>
      </div>

      {editor !== null && (
        <MemoEditor
          key={editor.memo ? editor.memo.id : 'new'}
          memo={editor.memo}
          codings={codings}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setEditor(null)}
        />
      )}

      {loading && <div className="cooc-status">备忘录加载中…</div>}
      {!loading && error && <div className="cooc-status error">{error}</div>}

      {!loading && !error && visible.length === 0 && (
        <div className="cooc-status">
          {list.length === 0
            ? '当前文档还没有备忘录。点击「新建备忘录」记录分析思路，并勾选标注作为证据。'
            : '当前筛选下没有备忘录。'}
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <ul className="memo-list">
          {visible.map((m) => (
            <li key={m.id} className={`memo-card${m.archived ? ' memo-archived' : ''}`}>
              <div className="memo-head">
                <strong className="memo-title">{m.title}</strong>
                {m.archived && <span className="memo-badge-archived">已归档</span>}
                {m.evidence_counts.changed > 0 && (
                  <span className="memo-flag">
                    {m.evidence_counts.changed} 条证据已变化
                  </span>
                )}
                {m.evidence_counts.deleted > 0 && (
                  <span className="memo-flag memo-flag-bad">
                    {m.evidence_counts.deleted} 条证据原标注已删除
                  </span>
                )}
              </div>
              <div className="memo-meta">
                创建于 {m.created_at}
                {m.updated_at !== m.created_at && ` · 更新于 ${m.updated_at}`}
                {m.archived && m.archived_at && ` · 归档于 ${m.archived_at}`}
                {m.evidence_counts.total > 0 && ` · ${m.evidence_counts.total} 条证据`}
              </div>
              {m.body && <div className="memo-body">{m.body}</div>}
              {m.evidences.length > 0 && (
                <ul className="memo-ev-list">
                  {m.evidences.map((ev) => (
                    <MemoEvidence key={ev.id} ev={ev} onLocate={onLocate} />
                  ))}
                </ul>
              )}
              <div className="memo-actions">
                <button
                  type="button"
                  onClick={() => setEditor({ memo: m })}
                  disabled={editor !== null}
                >
                  编辑
                </button>
                <button type="button" onClick={() => onArchive(m, !m.archived)}>
                  {m.archived ? '取消归档' : '归档'}
                </button>
                <button type="button" onClick={() => handleDelete(m)}>
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="hint">
        口径：证据在保存关联时记录编码 / 区间 / 原文摘录快照；标注被修改（改编码、
        改区间或区间原文变化）标示「已变化」并附当前值，标注被删除标示「原标注已删除」，
        快照本身始终保留。
      </p>
    </div>
  )
}
