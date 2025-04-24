import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Failed to find the root element");
} else {
  const root = createRoot(rootElement);
  
  try {
    root.render(
      <App />
    );
    console.log("Application successfully rendered");
  } catch (error) {
    console.error("Failed to render the application:", error);
    root.render(
      <div className="flex items-center justify-center h-screen flex-col">
        <h1 className="text-2xl font-bold mb-4">Application Error</h1>
        <p className="mb-4">The application failed to load. Please try refreshing the page.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Page
        </button>
      </div>
    );
  }
}
