import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Tracker = () => {
  return (
    <div className="space-y-6 px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold">My Pick Tracker 📊</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Season Record</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-around text-center py-2">
            {[
              { value: "0", label: "Win" },
              { value: "0", label: "Loss" },
              { value: "0", label: "Push" },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="text-3xl font-bold">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-muted-foreground text-sm mt-2">0 — 0 — 0</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Your saved picks will appear here
          </p>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Start saving picks from the Picks tab to track your record
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tracker;
