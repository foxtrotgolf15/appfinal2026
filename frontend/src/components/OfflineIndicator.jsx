import React from "react";

export default function OfflineIndicator() {
  const [online, setOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;
  return (
    <div 
      className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-full shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2"
      style={{ zIndex: 9999 }}
    >
      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
      <span>Estás offline</span>
    </div>
  );
}
