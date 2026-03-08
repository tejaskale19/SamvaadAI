import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import { AppProvider } from "../../context/AppContext";
import { AuthProvider } from "../../context/AuthContext";
import { ToastProvider } from "../../components/Toast";
import "../../i18n";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <AppProvider>
          <Component {...pageProps} />
          <ToastProvider />
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
