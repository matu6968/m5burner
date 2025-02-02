using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace ConsoleApplication1
{
    class Program
    {
        // MessageBox requires an STA thread.
        [STAThread]
        static void Main(string[] args)
        {
            string fileName = @".\bin\m5burner.exe";

            // Check if the executable exists.
            if (!File.Exists(fileName))
            {
                MessageBox.Show($"An M5Burner install could not be found at '{fileName}'. Make sure that M5Burner exists at that location and try again.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // Create and configure the process.
            Process process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = fileName,
                    CreateNoWindow = true,         // Run without creating a window.
                    UseShellExecute = false,       // Required for redirection.
                    RedirectStandardOutput = true  // Redirect standard output.
                }
            };

            try
            {
                // Start the process and wait for it to exit.
                process.Start();
                process.WaitForExit();
            }
            catch (Exception ex)
            {
                // In case an error occurs during process execution, show an error message.
                MessageBox.Show($"An error occurred while starting the process:\n{ex.Message}",
                                "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
