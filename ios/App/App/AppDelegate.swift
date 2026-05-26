import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var didCheckInitialLoad = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Wait 1 second for Capacitor to finish attaching the bridge and WKWebView,
        // then force-enable scrolling. Capacitor sometimes resets these after init.
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.configureWebViewScroll()
        }
        return true
    }

    private func configureWebViewScroll() {
        guard let vc = window?.rootViewController as? CAPBridgeViewController,
              let webView = vc.webView else { return }
        webView.scrollView.isScrollEnabled = true
        webView.scrollView.bounces = true
        webView.scrollView.alwaysBounceVertical = true
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
    }

    func applicationWillResignActive(_ application: UIApplication) {}

    func applicationDidEnterBackground(_ application: UIApplication) {}

    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Workaround for Capacitor + iPadOS 26 blank screen on launch.
        // Run once per app lifecycle to avoid unnecessary reloads on foreground transitions.
        guard !didCheckInitialLoad else { return }
        didCheckInitialLoad = true

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.reloadWebViewIfBlank()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.reloadWebViewIfBlank()
        }
    }

    private func reloadWebViewIfBlank() {
        guard let rootVC = window?.rootViewController as? CAPBridgeViewController,
              let webView = rootVC.bridge?.webView else { return }

        let urlString = webView.url?.absoluteString ?? ""

        if urlString.isEmpty || urlString == "about:blank" {
            let scheme = "ionic"
            if let url = URL(string: "\(scheme)://localhost") {
                webView.load(URLRequest(url: url))
            }
            return
        }

        guard !webView.isLoading else { return }
        webView.evaluateJavaScript(
            "document.readyState === 'complete' && document.body && document.body.children.length === 0"
        ) { [weak webView] result, _ in
            if result as? Bool == true {
                webView?.reload()
            }
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
