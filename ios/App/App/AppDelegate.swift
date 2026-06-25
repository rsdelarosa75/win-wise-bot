import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var didCheckInitialLoad = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Clear all WKWebView cache on every launch so the app always fetches
        // the latest JS/CSS from Vercel instead of serving a stale local bundle.
        WKWebsiteDataStore.default().removeData(
            ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
            modifiedSince: Date(timeIntervalSince1970: 0)
        ) { }

        // CapacitorViewDidAppear fires after CAPBridgeViewController.viewDidAppear,
        // which is AFTER prepareWebView() sets bounces=false and isScrollEnabled.
        // This is the only reliable hook to override those values.
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(capacitorViewDidAppear),
            name: Notification.Name("CapacitorViewDidAppear"),
            object: nil
        )
        return true
    }

    @objc private func capacitorViewDidAppear() {
        guard let vc = window?.rootViewController as? CAPBridgeViewController,
              let webView = vc.webView else { return }
        webView.scrollView.isScrollEnabled = true
        webView.scrollView.bounces = true
        webView.scrollView.alwaysBounceVertical = true
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        // iPadOS blocks touch-scroll when WKWebView's internal gesture recognizers
        // cancel the scrollView's pan gesture. Requiring 1 touch and making every
        // other recognizer on the scrollView defer to the pan gesture fixes this.
        webView.scrollView.panGestureRecognizer.minimumNumberOfTouches = 1
        for recognizer in webView.scrollView.gestureRecognizers ?? [] {
            if recognizer !== webView.scrollView.panGestureRecognizer {
                recognizer.require(toFail: webView.scrollView.panGestureRecognizer)
            }
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {}

    func applicationDidEnterBackground(_ application: UIApplication) {}

    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Workaround for Capacitor + iPadOS 26 blank screen on launch.
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
        guard let vc = window?.rootViewController as? CAPBridgeViewController,
              let webView = vc.webView else { return }

        let urlString = webView.url?.absoluteString ?? ""

        if urlString.isEmpty || urlString == "about:blank" {
            if let url = URL(string: "ionic://localhost") {
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
