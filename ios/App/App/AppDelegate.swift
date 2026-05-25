import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var didCheckInitialLoad = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Workaround for Capacitor + iPadOS 26 blank screen on launch.
        // Run once per app lifecycle to avoid unnecessary reloads on foreground transitions.
        guard !didCheckInitialLoad else { return }
        didCheckInitialLoad = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.reloadWebViewIfBlank()
        }
    }

    private func reloadWebViewIfBlank() {
        guard let rootVC = window?.rootViewController as? CAPBridgeViewController,
              let webView = rootVC.bridge?.webView,
              !webView.isLoading else { return }

        let urlString = webView.url?.absoluteString ?? ""
        if urlString.isEmpty || urlString == "about:blank" {
            // Page never loaded — drive Capacitor to its initial URL.
            if let url = URL(string: "ionic://localhost") {
                webView.load(URLRequest(url: url))
            }
            return
        }

        // Page has a URL but may have rendered blank; check via JS once the
        // document is fully parsed before deciding to reload.
        webView.evaluateJavaScript("document.readyState === 'complete' && document.body.children.length === 0") { [weak webView] result, _ in
            if result as? Bool == true {
                webView?.reload()
            }
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
