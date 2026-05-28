import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  Lock,
  PlayCircle,
  GraduationCap,
  ShieldAlert,
  Award,
  RotateCcw,
  Lightbulb,
  Layers,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Lesson, LessonProgress } from '../types';
import { getLessonVideoUrl } from '../utils/videoStore';
import toast from 'react-hot-toast';

function emptyProgress(lessonId: string): LessonProgress {
  return {
    lessonId,
    videoWatched: false,
    quizPassed: false,
    bestScorePct: 0,
    attempts: 0,
    timeSpentSec: 0,
  };
}

function isMp4(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url);
}

function toEmbed(url: string): string {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return url;
}

export default function Learn() {
  const { tracks, lessons, myProgress, recordVideoWatched, recordQuizResult, currentUser } = useApp();

  const activeTracks = useMemo(
    () => tracks.filter((t) => t.active).sort((a, b) => a.order - b.order),
    [tracks]
  );
  const [trackId, setTrackId] = useState<string>(activeTracks[0]?.id ?? '');
  const effectiveTrackId = activeTracks.some((t) => t.id === trackId) ? trackId : activeTracks[0]?.id ?? '';

  const trackLessons = useMemo(
    () => lessons.filter((l) => l.active && l.trackId === effectiveTrackId).sort((a, b) => a.order - b.order),
    [lessons, effectiveTrackId]
  );

  const progress = myProgress();
  const revoked = progress?.revoked === true;
  const progMap = progress?.lessons ?? {};

  const unlockedUpTo = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < trackLessons.length; i++) {
      const lp = progMap[trackLessons[i].id];
      const done = lp?.videoWatched && lp?.quizPassed;
      if (done) idx = i + 1;
      else break;
    }
    return idx;
  }, [trackLessons, progMap]);

  const completedCount = trackLessons.filter(
    (l) => progMap[l.id]?.videoWatched && progMap[l.id]?.quizPassed
  ).length;
  const overallPct = trackLessons.length
    ? Math.round((completedCount / trackLessons.length) * 100)
    : 0;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    // Yo'nalish o'zgarganda — birinchi ochiq darsni tanlaymiz
    const target = trackLessons[Math.min(unlockedUpTo, trackLessons.length - 1)]?.id ?? null;
    setSelectedId(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTrackId, trackLessons.length]);

  const selected = trackLessons.find((l) => l.id === selectedId) ?? null;
  const selectedIndex = trackLessons.findIndex((l) => l.id === selectedId);
  const selectedLocked = selectedIndex > unlockedUpTo;

  if (revoked) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-red-700 dark:text-red-300">Kirish bekor qilingan</h2>
          <p className="text-sm text-red-600/80 dark:text-red-300/70 mt-2">
            O'quv markaziga kirishingiz administrator tomonidan to'xtatilgan.
            Iltimos, rahbaringiz bilan bog'laning.
          </p>
        </div>
      </div>
    );
  }

  if (activeTracks.length === 0 || trackLessons.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center text-slate-500">
        <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
        Hozircha darslar qo'shilmagan. Administrator darslik qo'shganda shu yerda paydo bo'ladi.
      </div>
    );
  }

  const allDone = completedCount === trackLessons.length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-11 w-11 rounded-xl bg-brand-500/15 text-brand-500 flex items-center justify-center">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">O'quv markazi</h1>
          <p className="text-sm text-slate-500">
            {currentUser?.fullName ?? currentUser?.username} — {completedCount}/{trackLessons.length} dars tugatildi
          </p>
        </div>
        {allDone && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
            <Award className="h-4 w-4" /> To'liq tayyor!
          </div>
        )}
      </div>

      {/* Yo'nalishlar */}
      {activeTracks.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {activeTracks.map((t) => (
            <button
              key={t.id}
              onClick={() => setTrackId(t.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition border ${
                effectiveTrackId === t.id
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              style={effectiveTrackId === t.id && t.color ? { backgroundColor: t.color, borderColor: t.color } : undefined}
            >
              <Layers className="h-4 w-4" /> {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Umumiy progress</span>
          <span className="font-semibold">{overallPct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${overallPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-5">
        <div className="space-y-2">
          {trackLessons.map((lesson, i) => {
            const lp = progMap[lesson.id];
            const done = lp?.videoWatched && lp?.quizPassed;
            const locked = i > unlockedUpTo;
            const isActive = lesson.id === selectedId;
            return (
              <button
                key={lesson.id}
                onClick={() => setSelectedId(lesson.id)}
                className={`w-full text-left rounded-xl border px-3.5 py-3 transition-all ${
                  isActive
                    ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10 ring-1 ring-brand-400/40'
                    : 'border-slate-200 dark:border-slate-800 hover:border-brand-300 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                      done
                        ? 'bg-emerald-500 text-white'
                        : locked
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                          : 'bg-brand-500/15 text-brand-500'
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : locked ? <Lock className="h-3.5 w-3.5" /> : lesson.day}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">Dars {lesson.day}</div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {lesson.title}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div>
          {selected ? (
            selectedLocked ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
                <Lock className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Bu dars hali qulflangan</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Avval oldingi darslarni to'liq tugating (video + test 100%).
                </p>
              </div>
            ) : (
              <LessonView
                key={selected.id}
                lesson={selected}
                progress={progMap[selected.id] ?? emptyProgress(selected.id)}
                onVideoWatched={() => recordVideoWatched(selected.id)}
                onQuizSubmit={(pct, sec) => recordQuizResult(selected.id, pct, selected.passScorePct, sec)}
                onNext={() => {
                  const next = trackLessons[selectedIndex + 1];
                  if (next) setSelectedId(next.id);
                }}
                hasNext={selectedIndex < trackLessons.length - 1}
              />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LessonView({
  lesson,
  progress,
  onVideoWatched,
  onQuizSubmit,
  onNext,
  hasNext,
}: {
  lesson: Lesson;
  progress: LessonProgress;
  onVideoWatched: () => void;
  onQuizSubmit: (scorePct: number, seconds: number) => boolean;
  onNext: () => void;
  hasNext: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const maxWatchedRef = useRef(0);
  const quizStartRef = useRef<number>(Date.now());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ pct: number; passed: boolean } | null>(null);
  const [videoWatched, setVideoWatched] = useState(progress.videoWatched);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Yuklangan videoni IndexedDB'dan o'qiymiz (lokal qurilmada)
  useEffect(() => {
    let revoke: string | null = null;
    if (lesson.videoUploaded) {
      getLessonVideoUrl(lesson.id).then((url) => {
        if (url) {
          revoke = url;
          setUploadedUrl(url);
        }
      });
    }
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [lesson.id, lesson.videoUploaded]);

  const hasRemoteVideo = !!lesson.videoUrl;
  const directRemote = hasRemoteVideo && isMp4(lesson.videoUrl!);
  const playerSrc = uploadedUrl ?? (directRemote ? lesson.videoUrl! : null);
  const showIframe = !uploadedUrl && hasRemoteVideo && !directRemote;
  const hasVideo = !!playerSrc || showIframe;

  function markWatched() {
    if (videoWatched) return;
    setVideoWatched(true);
    onVideoWatched();
    toast.success('Video belgilandi ✓');
  }
  function handleSeeking() {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime > maxWatchedRef.current + 1.5) v.currentTime = maxWatchedRef.current;
  }
  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime > maxWatchedRef.current) maxWatchedRef.current = v.currentTime;
  }

  function submitQuiz() {
    if (lesson.quiz.length === 0) {
      const passed = onQuizSubmit(100, Math.round((Date.now() - quizStartRef.current) / 1000));
      setResult({ pct: 100, passed });
      return;
    }
    const unanswered = lesson.quiz.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      toast.error('Barcha savollarga javob bering');
      return;
    }
    const correct = lesson.quiz.filter((q) => answers[q.id] === q.correctOptionId).length;
    const pct = Math.round((correct / lesson.quiz.length) * 100);
    const sec = Math.round((Date.now() - quizStartRef.current) / 1000);
    const passed = onQuizSubmit(pct, sec);
    setResult({ pct, passed });
    if (passed) toast.success(`Ajoyib! ${pct}% — test topshirildi`);
    else toast.error(`${pct}% — o'tish uchun ${lesson.passScorePct}% kerak. Qayta urinib ko'ring.`);
  }

  function retry() {
    setAnswers({});
    setResult(null);
    quizStartRef.current = Date.now();
  }

  const videoRequirementMet = !hasVideo || videoWatched;
  const lessonDone = videoRequirementMet && (result?.passed || progress.quizPassed);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800">
        <div className="text-[11px] uppercase tracking-wide text-brand-500 font-semibold">Dars {lesson.day}</div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">{lesson.title}</h2>
        {lesson.summary && <p className="text-sm text-slate-500 mt-1">{lesson.summary}</p>}
      </div>

      <div className="p-5 space-y-4">
        {hasVideo ? (
          <div className="space-y-2">
            {playerSrc ? (
              <video
                ref={videoRef}
                src={playerSrc}
                controls
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                onSeeking={handleSeeking}
                onTimeUpdate={handleTimeUpdate}
                onEnded={markWatched}
                className="w-full rounded-xl bg-black aspect-video"
              />
            ) : (
              <div className="aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src={toEmbed(lesson.videoUrl!)}
                  title={lesson.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {!videoWatched ? (
              <button
                onClick={markWatched}
                className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition"
              >
                <PlayCircle className="h-4 w-4" /> Videoni ko'rib bo'ldim
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" /> Video ko'rildi
              </div>
            )}
          </div>
        ) : null}

        {lesson.content && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              <BookOpen className="h-4 w-4 text-brand-500" /> Dars materiali
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {lesson.content}
            </p>
          </div>
        )}

        {/* Tip & Trick */}
        {lesson.tips?.length > 0 && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">
              <Lightbulb className="h-4 w-4" /> Maslahatlar (Tip & Trick)
            </div>
            <ul className="space-y-1.5">
              {lesson.tips.map((tip, i) => (
                <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                  <span className="text-amber-500 font-bold">•</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Caselar */}
        {lesson.cases?.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Layers className="h-4 w-4 text-brand-500" /> Amaliy holatlar (Case)
            </div>
            {lesson.cases.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-3">
                  📌 {c.situation}
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                      <ThumbsUp className="h-3.5 w-3.5" /> To'g'ri
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{c.goodResponse}</p>
                  </div>
                  {c.badResponse && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                        <ThumbsDown className="h-3.5 w-3.5" /> Noto'g'ri
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{c.badResponse}</p>
                    </div>
                  )}
                </div>
                {c.note && <p className="text-xs text-slate-500 mt-2">💡 {c.note}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Test */}
        {lesson.quiz.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                Test ({lesson.quiz.length} savol) — o'tish: {lesson.passScorePct}%
              </h3>
              {progress.quizPassed && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Avval topshirilgan ✓</span>
              )}
            </div>

            {lesson.quiz.map((q, qi) => (
              <div key={q.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-3">
                  {qi + 1}. {q.question}
                  {q.type === 'situational' && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-500">vaziyatli</span>
                  )}
                </div>
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const chosen = answers[q.id] === opt.id;
                    const showCorrect = !!result && q.correctOptionId === opt.id;
                    const showWrong = !!result && chosen && q.correctOptionId !== opt.id;
                    return (
                      <button
                        key={opt.id}
                        disabled={!!result}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                        className={`w-full text-left text-sm rounded-lg border px-3 py-2 transition ${
                          showCorrect
                            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                            : showWrong
                              ? 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                              : chosen
                                ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10'
                                : 'border-slate-200 dark:border-slate-800 hover:border-brand-300'
                        }`}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
                {result && q.explanation && <p className="text-xs text-slate-500 mt-2">{q.explanation}</p>}
              </div>
            ))}

            {result ? (
              <div
                className={`rounded-xl p-4 flex items-center justify-between gap-3 ${
                  result.passed
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                }`}
              >
                <div className="font-semibold">
                  {result.passed ? `Topshirildi — ${result.pct}%` : `${result.pct}% — yetarli emas`}
                </div>
                {!result.passed && (
                  <button
                    onClick={retry}
                    className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-current/20"
                  >
                    <RotateCcw className="h-4 w-4" /> Qayta urinish
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={submitQuiz}
                disabled={!videoRequirementMet}
                className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition"
              >
                {videoRequirementMet ? 'Testni topshirish' : 'Avval videoni ko\'ring'}
              </button>
            )}
          </div>
        )}

        {lesson.quiz.length === 0 && !progress.quizPassed && !result && (
          <button
            onClick={submitQuiz}
            disabled={!videoRequirementMet}
            className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold transition"
          >
            Darsni tugatish
          </button>
        )}

        {lessonDone && hasNext && (
          <button
            onClick={onNext}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
          >
            Keyingi darsga o'tish →
          </button>
        )}
      </div>
    </div>
  );
}
