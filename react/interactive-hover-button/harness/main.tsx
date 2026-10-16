import { createRoot } from "react-dom/client"

import { InteractiveHoverButtonDemo } from "../demo"

const host = document.getElementById("root")
if (host) createRoot(host).render(<InteractiveHoverButtonDemo />)
