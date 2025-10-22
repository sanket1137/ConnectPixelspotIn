import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface ComingSoonProps {
  title: string;
  description: string;
  backLink?: string;
  backLabel?: string;
}

export default function ComingSoon({ title, description, backLink, backLabel = "Go Back" }: ComingSoonProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold">{title}</CardTitle>
            <CardDescription className="text-base">{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Rocket className="h-5 w-5" />
            <p className="text-sm">This feature is currently under development</p>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We're working hard to bring you this feature. Check back soon!
            </p>
            {backLink && (
              <Button
                onClick={() => setLocation(backLink)}
                variant="default"
                data-testid="button-go-back"
              >
                {backLabel}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
