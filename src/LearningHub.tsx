import { BookOpen, ChevronRight, Sparkles } from "lucide-react";
import {
  getCompletedGrammarLessonCount,
  getGrammarLessonNumber,
  getNextGrammarLesson,
  GRAMMAR_CURRICULUM,
} from "./curriculum";
import { daysSinceStart, type Progress } from "./progress";

type Props = {
  progress: Progress;
  onStartLesson: (chapter: number) => void;
  onBrowse: () => void;
};

function LearningHub({ progress, onStartLesson, onBrowse }: Props) {
  const nextLesson = getNextGrammarLesson(progress);
  const completedCount = getCompletedGrammarLessonCount(progress);
  const totalLessons = GRAMMAR_CURRICULUM.length;
  const day = daysSinceStart(progress);

  return (
    <main className="hub-shell">
      <div className="hub-inner">
        <header className="hub-header">
          <div className="hub-brand">
            <span className="brand-mark" aria-hidden="true">
              <BookOpen size={22} />
            </span>
            <div>
              <p className="eyebrow">Tehilim</p>
              <h1>Learn Hebrew through Psalms</h1>
            </div>
          </div>
          <p className="hub-lede">
            Follow a beginner grammar path. Each lesson teaches one Hebrew pattern and unlocks a
            real Psalm phrase.
          </p>
        </header>

        <section className="hub-section">
          <h2 className="hub-section-title">Continue learning</h2>

          {nextLesson ? (
            <article className="lesson-card">
              <div className="lesson-card-head">
                <p className="eyebrow">Grammar lesson {getGrammarLessonNumber(nextLesson.id)}</p>
                <h3>{nextLesson.title}</h3>
              </div>

              <dl className="lesson-stats">
                <div>
                  <dt>Stage</dt>
                  <dd>{nextLesson.stage}</dd>
                </div>
                <div>
                  <dt>Unlocks</dt>
                  <dd>
                    Psalm {nextLesson.unlock.psalm}:{nextLesson.unlock.verse}
                  </dd>
                </div>
                <div>
                  <dt>Path</dt>
                  <dd>
                    {completedCount} / {totalLessons} complete
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                className="lesson-cta"
                onClick={() => onStartLesson(nextLesson.unlock.psalm)}
              >
                Begin lesson
                <ChevronRight size={18} />
              </button>
            </article>
          ) : (
            <article className="lesson-card">
              <div className="lesson-card-head">
                <p className="eyebrow">Milestone</p>
                <h3>Psalm 117 unlocked</h3>
              </div>
              <p className="hub-lede">
                You completed the first grammar path. Read Psalm 117 with the patterns you learned.
              </p>
              <button type="button" className="lesson-cta" onClick={() => onBrowse()}>
                Open reader
                <ChevronRight size={18} />
              </button>
            </article>
          )}
        </section>

        <section className="hub-section">
          <h2 className="hub-section-title">Your progress</h2>
          <ul className="progress-list">
            <li>
              <span className="progress-icon" aria-hidden="true">
                <Sparkles size={16} />
              </span>
              <div>
                <strong>
                  {completedCount} {completedCount === 1 ? "grammar lesson" : "grammar lessons"}{" "}
                  completed
                </strong>
                <span className="muted">
                  {totalLessons - completedCount} left in the first Psalm 117 path
                </span>
              </div>
            </li>
            <li>
              <span className="progress-icon" aria-hidden="true">
                <BookOpen size={16} />
              </span>
              <div>
                <strong>Psalm phrases unlocked through grammar</strong>
                <span className="muted">
                  Day {day}
                  {day === 1 ? " · welcome" : ""}
                </span>
              </div>
            </li>
          </ul>
        </section>

        <button type="button" className="hub-browse" onClick={onBrowse}>
          Browse all psalms
          <ChevronRight size={16} />
        </button>

        <p className="hub-foot">
          Hebrew text from MACULA Hebrew (CC BY 4.0). English from Sefaria.
        </p>
      </div>
    </main>
  );
}

export default LearningHub;
