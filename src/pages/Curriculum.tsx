import { useMemo, useState } from 'react';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  GraduationCap,
  Users as UsersIcon,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Video,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Lesson, QuizQuestion } from '../types';
import { randomId } from '../utils/format';
import toast from 'react-hot-toast';

function blankLesson(nextDay: number): Lesson {
  return {
    id: randomId('lesson'),
    day: nextDay,
    title: '',
    summary: '',
    content: '',
    videoUrl: '',
    quiz: [],
    passScorePct: 100,
    active: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function blankQuestion(): QuizQuestion {
  const a = randomId('opt');
  return {
    id: randomId('q'),
    type: 'single',
    question: '',
    options: [
      { id: a, text: '' },
      { id: randomId('opt'), text: '' },
    ],
    correctOptionId: a,
  };
}

export default function Curriculum() {
  const { lessons, saveLesson, deleteLesson, users, learnerProgress, setLearnerRevoked } = useApp();
  const [tab, setTab] = useState<'lessons' | 'learners'>('lessons');
  const [editing, setEditing] = useState<Lesson | null>(null);

  const sorted = useMemo(() => [...lessons].sort((a, b) => a.day - b.day), [lessons]);
  const nextDay = sorted.length ? Math.max(...sorted.map((l) => l.day)) + 1 : 1;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-11 w-11 rounded-xl bg-brand-500/15 text-brand-500 flex items-center justify-center">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Darslik boshqaruvi</h1>
          <p className="text-sm text-slate-500">O'quv dasturi va o'quvchilar nazorati</p>
        </div>
        {tab === 'lessons' && (
          <button
            onClick={() => setEditing(blankLesson(nextDay))}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition"
          >
            <Plus className="h-4 w-4" /> Yangi kun
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-5">
        <TabBtn active={tab === 'lessons'} onClick={() => setTab('lessons')} icon={BookOpen} label={`Darslar (${lessons.length})`} />
        <TabBtn active={tab === 'learners'} onClick={() => setTab('learners')} icon={UsersIcon} label="O'quvchilar" />
      </div>

      {tab === 'lessons' ? (
        <div className="space-y-2">
          {sorted.length === 0 && (
            <div className="text-center text-slate-500 py-10">
              Hali dars yo'q. "Yangi kun" tugmasi orqali qo'shing.
            </div>
          )}
          {sorted.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3"
            >
              <div className="h-9 w-9 rounded-lg bg-brand-500/15 text-brand-500 flex items-center justify-center font-bold flex-shrink-0">
                {l.day}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 dark:text-slate-100 truncate flex items-center gap-2">
                  {l.title || <span className="text-slate-400 italic">Sarlavhasiz</span>}
                  {!l.active && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500">yashirin</span>}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                  <span>{l.quiz.length} savol</span>
                  {l.videoUrl ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><Video className="h-3 w-3" /> video bor</span>
                  ) : (
                    <span className="text-amber-500">video yo'q</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setEditing(l)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                title="Tahrirlash"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`"${l.title || 'Kun ' + l.day}" o'chirilsinmi?`)) {
                    void deleteLesson(l.id);
                    toast.success("Dars o'chirildi");
                  }
                }}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500"
                title="O'chirish"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <LearnerTelemetry
          users={users}
          lessons={lessons}
          learnerProgress={learnerProgress}
          onToggleRevoke={setLearnerRevoked}
        />
      )}

      {editing && (
        <LessonEditor
          lesson={editing}
          onClose={() => setEditing(null)}
          onSave={async (l) => {
            if (!l.title.trim()) {
              toast.error('Sarlavha kiriting');
              return;
            }
            try {
              await saveLesson(l);
              toast.success('Saqlandi');
              setEditing(null);
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof BookOpen; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
        active ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function LearnerTelemetry({
  users,
  lessons,
  learnerProgress,
  onToggleRevoke,
}: {
  users: ReturnType<typeof useApp>['users'];
  lessons: Lesson[];
  learnerProgress: ReturnType<typeof useApp>['learnerProgress'];
  onToggleRevoke: (userId: string, revoked: boolean) => void;
}) {
  const total = lessons.filter((l) => l.active).length;
  const operators = users.filter((u) => u.role === 'operator');

  if (operators.length === 0) {
    return <div className="text-center text-slate-500 py-10">Operator yo'q. Foydalanuvchilar bo'limidan qo'shing.</div>;
  }

  return (
    <div className="space-y-2">
      {operators.map((u) => {
        const prog = learnerProgress.find((p) => p.userId === u.id);
        const done = prog
          ? lessons.filter((l) => l.active && prog.lessons[l.id]?.videoWatched && prog.lessons[l.id]?.quizPassed).length
          : 0;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const totalTime = prog
          ? Math.round(Object.values(prog.lessons).reduce((s, lp) => s + (lp.timeSpentSec || 0), 0) / 60)
          : 0;
        const revoked = prog?.revoked === true;
        const allDone = total > 0 && done === total;
        return (
          <div
            key={u.id}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-brand-500/15 text-brand-500 flex items-center justify-center font-semibold flex-shrink-0">
                {(u.fullName ?? u.username)[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 dark:text-slate-100 truncate flex items-center gap-2">
                  {u.fullName ?? u.username}
                  {allDone && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {revoked && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-600">bloklangan</span>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {done}/{total} kun • {totalTime} daqiqa sarflandi
                  {prog?.updatedAt ? ` • oxirgi: ${new Date(prog.updatedAt).toLocaleDateString('uz')}` : ' • boshlamagan'}
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-lg font-bold text-slate-800 dark:text-white">{pct}%</div>
              </div>
              <button
                onClick={() => onToggleRevoke(u.id, !revoked)}
                title={revoked ? 'Kirishni qaytarish' : 'Kirishni bekor qilish'}
                className={`p-2 rounded-lg transition ${
                  revoked
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 hover:bg-emerald-100'
                    : 'bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100'
                }`}
              >
                {revoked ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              </button>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-2.5">
              <div
                className={`h-full rounded-full ${allDone ? 'bg-emerald-500' : 'bg-brand-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LessonEditor({
  lesson,
  onClose,
  onSave,
}: {
  lesson: Lesson;
  onClose: () => void;
  onSave: (l: Lesson) => void;
}) {
  const [draft, setDraft] = useState<Lesson>(lesson);

  function patch(p: Partial<Lesson>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function updateQuestion(qid: string, p: Partial<QuizQuestion>) {
    setDraft((d) => ({ ...d, quiz: d.quiz.map((q) => (q.id === qid ? { ...q, ...p } : q)) }));
  }

  function addQuestion() {
    setDraft((d) => ({ ...d, quiz: [...d.quiz, blankQuestion()] }));
  }
  function removeQuestion(qid: string) {
    setDraft((d) => ({ ...d, quiz: d.quiz.filter((q) => q.id !== qid) }));
  }
  function addOption(qid: string) {
    setDraft((d) => ({
      ...d,
      quiz: d.quiz.map((q) =>
        q.id === qid ? { ...q, options: [...q.options, { id: randomId('opt'), text: '' }] } : q
      ),
    }));
  }
  function removeOption(qid: string, oid: string) {
    setDraft((d) => ({
      ...d,
      quiz: d.quiz.map((q) => {
        if (q.id !== qid) return q;
        const options = q.options.filter((o) => o.id !== oid);
        const correctOptionId = q.correctOptionId === oid ? options[0]?.id ?? '' : q.correctOptionId;
        return { ...q, options, correctOptionId };
      }),
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4">
      <div className="w-full max-w-2xl my-4 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl">
          <h2 className="font-bold text-slate-800 dark:text-white">Kun {draft.day} — tahrirlash</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Kun raqami">
              <input
                type="number"
                min={1}
                value={draft.day}
                onChange={(e) => patch({ day: parseInt(e.target.value) || 1 })}
                className={inputCls}
              />
            </Field>
            <Field label="O'tish foizi (%)">
              <input
                type="number"
                min={0}
                max={100}
                value={draft.passScorePct}
                onChange={(e) => patch({ passScorePct: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                className={inputCls}
              />
            </Field>
            <Field label="Holat">
              <label className="flex items-center gap-2 h-[42px] px-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input type="checkbox" checked={draft.active} onChange={(e) => patch({ active: e.target.checked })} />
                <span className="text-sm">Faol</span>
              </label>
            </Field>
          </div>

          <Field label="Sarlavha">
            <input value={draft.title} onChange={(e) => patch({ title: e.target.value })} className={inputCls} placeholder="Masalan: Mijoz bilan muloqot odobi" />
          </Field>

          <Field label="Qisqa tavsif">
            <input value={draft.summary ?? ''} onChange={(e) => patch({ summary: e.target.value })} className={inputCls} />
          </Field>

          <Field label="Video havola (mp4 yoki YouTube)">
            <input value={draft.videoUrl ?? ''} onChange={(e) => patch({ videoUrl: e.target.value })} className={inputCls} placeholder="https://... .mp4 yoki https://youtu.be/..." />
          </Field>

          <Field label="Dars materiali / skript">
            <textarea
              value={draft.content ?? ''}
              onChange={(e) => patch({ content: e.target.value })}
              rows={5}
              className={inputCls + ' resize-y'}
              placeholder="Operator o'qishi kerak bo'lgan matn, skriptlar, bilim bazasi..."
            />
          </Field>

          {/* Quiz editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">Test savollari ({draft.quiz.length})</h3>
              <button onClick={addQuestion} className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20">
                <Plus className="h-4 w-4" /> Savol
              </button>
            </div>

            {draft.quiz.map((q, qi) => (
              <div key={q.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-slate-500 mt-2">{qi + 1}.</span>
                  <input
                    value={q.question}
                    onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                    className={inputCls}
                    placeholder="Savol matni"
                  />
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuizQuestion['type'] })}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm px-2 h-[42px]"
                  >
                    <option value="single">Oddiy</option>
                    <option value="situational">Vaziyatli</option>
                  </select>
                  <button onClick={() => removeQuestion(q.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 mt-0.5">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="pl-6 space-y-1.5">
                  {q.options.map((o) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={q.correctOptionId === o.id}
                        onChange={() => updateQuestion(q.id, { correctOptionId: o.id })}
                        title="To'g'ri javob"
                      />
                      <input
                        value={o.text}
                        onChange={(e) =>
                          updateQuestion(q.id, { options: q.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })
                        }
                        className={inputCls + ' py-1.5'}
                        placeholder="Variant matni"
                      />
                      {q.options.length > 2 && (
                        <button onClick={() => removeOption(q.id, o.id)} className="p-1.5 rounded text-slate-400 hover:text-red-500">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addOption(q.id)} className="text-xs text-brand-500 hover:underline mt-1">
                    + variant qo'shish
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            Bekor qilish
          </button>
          <button onClick={() => onSave(draft)} className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold">
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-400/40';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
