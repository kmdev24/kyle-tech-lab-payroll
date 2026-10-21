import { CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: "PENDING" | "RECEIVED" }) {
  return status === "RECEIVED" ? (
    <Badge variant="success">
      <CheckCircle2 className="h-3 w-3" /> Received
    </Badge>
  ) : (
    <Badge variant="warning">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}
