import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket } from "lucide-react";
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
          <div className="mx-auto">
            <Badge variant="secondary" className="text-sm px-4 py-2">
              <Rocket className="h-4 w-4 mr-2" />
              Upcoming
            </Badge>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold">{title}</CardTitle>
            <CardDescription className="text-base">{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            This feature is coming soon!
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
        </CardContent>
      </Card>
    </div>
  );
}
