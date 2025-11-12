import Joyride, { Step, CallBackProps, STATUS, EVENTS } from "react-joyride";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface GuidedTourProps {
  steps: Step[];
  run: boolean;
  onFinish?: () => void;
  continuous?: boolean;
  showSkipButton?: boolean;
}

export default function GuidedTour({ 
  steps, 
  run, 
  onFinish,
  continuous = true,
  showSkipButton = true 
}: GuidedTourProps) {
  
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/profile/complete-onboarding", "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status as any)) {
      // Tour finished or skipped - mark onboarding as complete
      completeOnboardingMutation.mutate();
      onFinish?.();
    }

    // Also handle the close button click
    if (type === EVENTS.TOUR_END && status === STATUS.FINISHED) {
      completeOnboardingMutation.mutate();
      onFinish?.();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={continuous}
      showSkipButton={showSkipButton}
      showProgress
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--card))",
          overlayColor: "rgba(0, 0, 0, 0.6)",
          arrowColor: "hsl(var(--card))",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "0.5rem",
          padding: "1rem",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          borderRadius: "0.375rem",
          padding: "0.5rem 1rem",
          fontSize: "0.875rem",
          fontWeight: 500,
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          marginRight: "0.5rem",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip Tour",
      }}
    />
  );
}
