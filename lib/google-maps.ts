let loaderPromise: Promise<void> | null = null;

declare global {
  interface Window { __hyderabadRentGoogleMapsReady?: () => void; }
}

export function loadGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps can only load in the browser."));
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    const callbackName = "__hyderabadRentGoogleMapsReady";
    window[callbackName] = () => { resolve(); delete window[callbackName]; };
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = "https://maps.googleapis.com/maps/api/js" +
      `?key=${encodeURIComponent(apiKey)}` + `&callback=${callbackName}` +
      "&v=weekly&loading=async&libraries=places,marker";
    script.onerror = () => { loaderPromise = null; reject(new Error("Google Maps failed to load.")); };
    document.head.appendChild(script);
  });
  return loaderPromise;
}
