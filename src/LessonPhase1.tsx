import { BookOpen, Check, ChevronRight, Home } from "lucide-react";
import {
  getGrammarLessonNumber,
  getNextGrammarLesson,
  type GrammarLesson,
} from "./curriculum";
import { markGrammarLessonCompleted, type Progress } from "./progress";

type Props = {
  progress: Progress;
  setProgress: (next: Progress) => void;
  onReadPsalm: (chapter: number) => void;
  onBackToHub: () => void;
};

function LessonPhase1({ progress, setProgress, onReadPsalm, onBackToHub }: Props) {
  const lesson = getNextGrammarLesson(progress);

  if (!lesson) {
    return (
      <main className="lesson-shell">
        <div className="lesson-empty">
          <p className="lesson-empty-head">You finished the first grammar path.</p>
          <p>Psalm 117 is ready for a guided read. More grammar units can build from here.</p>
          <div className="lesson-empty-actions">
            <button type="button" className="ghost" onClick={onBackToHub}>
              <Home size={16} /> Back to hub
            </button>
            <button type="button" className="primary" onClick={() => onReadPsalm(117)}>
              Read Psalm 117
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </main>
    );
  }

  const lessonNumber = getGrammarLessonNumber(lesson.id);

  function completeLesson() {
    setProgress(markGrammarLessonCompleted(progress, lesson.id));
    onReadPsalm(lesson.unlock.psalm);
  }

  return (
    <main className="lesson-shell">
      <header className="lesson-header">
        <button
          type="button"
          className="lesson-back"
          onClick={onBackToHub}
          aria-label="Back to learning hub"
        >
          <Home size={16} />
        </button>
        <div className="lesson-title">
          <p className="eyebrow">
            Grammar lesson {lessonNumber} · {lesson.stage}
          </p>
          <h2>{lesson.title}</h2>
        </div>
        <span className="lesson-counter">Level {lesson.level}</span>
      </header>

      <p className="lesson-lede">
        {lesson.objective} Then see the Psalm phrase it unlocks.
      </p>

      <article className="study-card grammar">
        <GrammarLessonView lesson={lesson} />
      </article>

      <div className="study-actions">
        <button type="button" className="ghost" onClick={onBackToHub}>
          Back
        </button>
        <button type="button" className="primary" onClick={completeLesson}>
          Unlock Psalm phrase
          <ChevronRight size={16} />
        </button>
      </div>
    </main>
  );
}

function GrammarLessonView({ lesson }: { lesson: GrammarLesson }) {
  return (
    <>
      <p className="card-eyebrow">{lesson.concept}</p>
      <p className="grammar-body">{lesson.explanation}</p>

      <section className="grammar-model" aria-labelledby="model-heading">
        <span id="model-heading" className="grammar-pattern-label">
          Model
        </span>
        <span className="grammar-example-hebrew" dir="rtl" lang="he">
          {lesson.model.hebrew}
        </span>
        <span className="grammar-example-translation">{lesson.model.translation}</span>
        <span className="card-context-target">{lesson.model.note}</span>
      </section>

      <section className="grammar-practice" aria-labelledby="practice-heading">
        <span id="practice-heading" className="grammar-pattern-label">
          Notice
        </span>
        {lesson.practice.map((item) => (
          <div className="practice-row" key={item.prompt}>
            <Check size={16} aria-hidden="true" />
            <div>
              <span>{item.prompt}</span>
              <strong>{item.answer}</strong>
            </div>
          </div>
        ))}
      </section>

      <section className="grammar-unlock" aria-labelledby="unlock-heading">
        <span id="unlock-heading" className="grammar-pattern-label">
          Psalm unlock
        </span>
        <span className="grammar-example-hebrew" dir="rtl" lang="he">
          {lesson.unlock.hebrew}
        </span>
        <span className="grammar-example-translation">{lesson.unlock.translation}</span>
        <span className="unlock-reference">
          <BookOpen size={15} aria-hidden="true" />
          Psalm {lesson.unlock.psalm}:{lesson.unlock.verse}
        </span>
        <span className="card-context-target">{lesson.unlock.note}</span>
      </section>
    </>
  );
}

export default LessonPhase1;
