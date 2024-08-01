using Microsoft.UI;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using System;

namespace Milker
{
    public sealed partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();

            Activated += MainWindow_Activated;
            ((OverlappedPresenter)GetAppWindow(this).Presenter).Maximize();
        }

        private void MainWindow_Activated(object sender, WindowActivatedEventArgs args)
        {
            IntPtr windowHandle = WinRT.Interop.WindowNative.GetWindowHandle(this);
            WindowId windowId = Win32Interop.GetWindowIdFromWindow(windowHandle);
            AppWindow appWindow = AppWindow.GetFromWindowId(windowId);
            appWindow.SetIcon(@"Assets\icon.ico");
        }

        public static AppWindow GetAppWindow(Window window)
        {
            var windowHandle = WinRT.Interop.WindowNative.GetWindowHandle(window);
            var windowId = Win32Interop.GetWindowIdFromWindow(windowHandle);
            return AppWindow.GetFromWindowId(windowId);
        }

        public TextBlock GetMilker()
        {
            return this.MilkerTitle;
        }
    }
}
