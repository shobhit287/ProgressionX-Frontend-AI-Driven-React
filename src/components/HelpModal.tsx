import Modal from '@/components/ui/Modal';
import { HelpCircle, ChevronRight } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FAQ_DATA = [
  {
    question: "What is RIR?",
    answer: "RIR stands for Reps In Reserve. It's a way to measure training intensity. For example, '2 RIR' means you stopped the set when you felt you could have done exactly 2 more reps before your form broke down."
  },
  {
    question: "What is Progressive Overload?",
    answer: "It's the gradual increase of stress placed upon the body during training. You achieve this by lifting more weight, doing more reps, increasing sets, or improving your form over time."
  },
  {
    question: "What is Hypertrophy?",
    answer: "Hypertrophy simply means muscle growth. It's the process where muscle fibers increase in size through resistance training and proper nutrition."
  },
  {
    question: "What is Volume?",
    answer: "In fitness, volume usually refers to the total amount of work done. A common way to calculate it is: Sets x Reps x Weight."
  },
  {
    question: "How long should I rest?",
    answer: "For muscle growth (hypertrophy), 1-2 minutes is common. For strength, 3-5 minutes might be better. The key is to rest long enough to perform your next set with good technique."
  }
];

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <Modal open={isOpen} onClose={onClose} title="Fitness Guide & FAQ">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        <p className="text-sm text-muted mb-4">
          New to training? Here are some key concepts to help you get the most out of ProgressionX.
        </p>
        
        <div className="space-y-3">
          {FAQ_DATA.map((faq, index) => (
            <div 
              key={index}
              className="group rounded-xl border border-border bg-surface-light p-4 transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0 rounded-full bg-primary/10 p-1 text-primary">
                  <ChevronRight size={14} className="transition-transform group-hover:rotate-90" />
                </div>
                <div>
                  <h3 className="font-semibold text-text group-hover:text-primary transition-colors">
                    {faq.question}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl bg-primary/10 p-4 text-center">
          <p className="text-xs font-medium text-primary">
            Tip: Consistency and proper form are your best friends in the gym!
          </p>
        </div>
      </div>
    </Modal>
  );
}
