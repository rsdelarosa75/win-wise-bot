import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { N8nIntegration } from "./n8n-integration";
import { 
  Bot, 
  Calendar, 
  TrendingUp, 
  Bell, 
  Workflow,
  Clock,
  Target,
  BarChart3
} from "lucide-react";

export const AutomationHub = () => {
  const automationStats = [
    {
      icon: Bot,
      title: "Active Workflows",
      value: "5",
      description: "Running automations",
      color: "primary"
    },
    {
      icon: Calendar,
      title: "Daily Briefs",
      value: "2",
      description: "Scheduled reports",
      color: "accent"
    },
    {
      icon: TrendingUp,
      title: "Success Rate",
      value: "94%",
      description: "Workflow reliability",
      color: "win"
    },
    {
      icon: Clock,
      title: "Avg Processing",
      value: "45s",
      description: "Time per brief",
      color: "neutral"
    }
  ];

  const scheduledWorkflows = [
    {
      name: "Morning Brief Generator",
      schedule: "Daily at 6:00 AM",
      status: "active",
      nextRun: "Tomorrow 6:00 AM"
    },
    {
      name: "Injury Report Analyzer",
      schedule: "Every 2 hours",
      status: "active",
      nextRun: "In 47 minutes"
    },
    {
      name: "Line Movement Tracker",
      schedule: "Every 15 minutes",
      status: "paused",
      nextRun: "Paused"
    },
    {
      name: "Weather Impact Assessment",
      schedule: "Daily at 12:00 PM",
      status: "active",
      nextRun: "Today 12:00 PM"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-background via-card/10 to-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 text-sm mb-6">
            <Workflow className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">Automation Hub</span>
          </div>
          
          <h2 className="text-4xl font-bold mb-4">
            <span className="text-primary">Automated</span> Betting Intelligence
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Set up n8n workflows to automatically generate daily betting briefs, track line movements, 
            and analyze market conditions 24/7
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {automationStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20 text-center">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 ${
                  stat.color === 'primary' ? 'bg-primary/10' :
                  stat.color === 'accent' ? 'bg-accent/10' :
                  stat.color === 'win' ? 'bg-win/10' :
                  'bg-neutral/10'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    stat.color === 'primary' ? 'text-primary' :
                    stat.color === 'accent' ? 'text-accent' :
                    stat.color === 'win' ? 'text-win' :
                    'text-neutral'
                  }`} />
                </div>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm font-medium mb-1">{stat.title}</div>
                <div className="text-xs text-muted-foreground">{stat.description}</div>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="n8n" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-card/50">
            <TabsTrigger value="n8n" className="data-[state=active]:bg-primary/10">
              n8n Integration
            </TabsTrigger>
            <TabsTrigger value="workflows" className="data-[state=active]:bg-primary/10">
              Active Workflows
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary/10">
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="n8n" className="space-y-6">
            <N8nIntegration />
          </TabsContent>

          <TabsContent value="workflows" className="space-y-6">
            <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Scheduled Workflows</h3>
                <Button variant="outline" size="sm">
                  <Bell className="mr-2 w-4 h-4" />
                  Manage Alerts
                </Button>
              </div>

              <div className="space-y-4">
                {scheduledWorkflows.map((workflow, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border/30">
                    <div className="space-y-1">
                      <div className="font-medium">{workflow.name}</div>
                      <div className="text-sm text-muted-foreground">{workflow.schedule}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-muted-foreground">{workflow.nextRun}</div>
                      <Badge 
                        variant="outline" 
                        className={workflow.status === 'active' ? 'border-win/30 text-win' : 'border-neutral/30 text-neutral'}
                      >
                        {workflow.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
                <h3 className="text-xl font-semibold mb-4">Workflow Performance</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Execution Success Rate</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-secondary rounded-full">
                        <div className="w-[94%] h-2 bg-gradient-accent rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">94%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Processing Time</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-secondary rounded-full">
                        <div className="w-[75%] h-2 bg-gradient-primary rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">45s</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Accuracy</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-secondary rounded-full">
                        <div className="w-[98%] h-2 bg-win rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">98%</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
                <h3 className="text-xl font-semibold mb-4">Resource Usage</h3>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">156</div>
                    <div className="text-sm text-muted-foreground">Total Executions Today</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold text-accent">2.4K</div>
                      <div className="text-xs text-muted-foreground">API Calls</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-neutral">45MB</div>
                      <div className="text-xs text-muted-foreground">Data Processed</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};