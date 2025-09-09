import { Suspense } from "react";
import CenteredActionPage from "./CenteredActionPage";

function SaltEdgeCallback() {
  return (
    <div>
      <CenteredActionPage
        type="success"
        title="Connection Successful!"
        message="Your bank has been successfully registered."
        buttonText="Close Tab"
      />
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SaltEdgeCallback />
    </Suspense>
  );
}
