#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <string.h>
#include <grp.h>
#include <signal.h>
#include <libnotify/notify.h>

// Function to send notifications using libnotify
void send_notification(const char *title, const char *message) {
    if (notify_init("M5Burner Launcher")) {
        NotifyNotification *n = notify_notification_new(title, message, NULL);
        notify_notification_show(n, NULL);
        g_object_unref(G_OBJECT(n));
        notify_uninit();
    }
}

// Function to check if the user is in a specific group
int is_user_in_group(const char *group_name) {
    gid_t groups[128];
    int ngroups = 128;
    struct group *grp;

    grp = getgrnam(group_name);
    if (grp == NULL) {
        return 0; // Group does not exist
    }

    if (getgrouplist(getenv("USER"), getgid(), groups, &ngroups) == -1) {
        return 0;
    }

    for (int i = 0; i < ngroups; i++) {
        if (groups[i] == grp->gr_gid) {
            return 1;
        }
    }
    return 0;
}

// Function to launch M5Burner and handle failures
void launch_electron(const char *app_path, int use_no_sandbox) {
    pid_t pid = fork();

    if (pid == -1) {
        perror("Fork failed");
        exit(EXIT_FAILURE);
    }

    if (pid == 0) { 
        // Child process
        if (use_no_sandbox) {
            execl(app_path, app_path, "--no-sandbox", (char *)NULL);
        } else {
            execl(app_path, app_path, (char *)NULL);
        }
        perror("execl failed");
        exit(EXIT_FAILURE);
    } else {
        // Parent process: wait for child to finish
        int status;
        waitpid(pid, &status, 0);

        if (WIFSIGNALED(status)) {
            int signal = WTERMSIG(status);

            if (signal == SIGTRAP) {
                // SUID sandbox error
                printf("Electron crashed due to a SUID sandbox issue.\n");
                printf("To fix permanently, run:\n");
                printf("  sudo chown root:root /opt/M5Burner/bin/chrome-sandbox\n");
                printf("  sudo chmod 4755 /opt/M5Burner/bin/chrome-sandbox\n");
                printf("For now, relaunching without sandboxing...\n");

                send_notification("Electron Sandbox Issue", 
                               "Electron crashed due to a sandbox issue.\nRunning without sandboxing.");

                launch_electron(app_path, 1); // Relaunch with --no-sandbox
            } else if (signal == SIGSEGV) {
                // Segmentation fault (common with missing GPU libraries)
                printf("Electron crashed with a segmentation fault!\n");
                send_notification("Electron Crash", "Electron crashed due to a segmentation fault.");
            } else {
                // Other crash reasons
                printf("Electron crashed with signal %d.\n", signal);
                send_notification("Electron Crash", "Electron crashed unexpectedly.");
            }
        } else if (WIFEXITED(status) && WEXITSTATUS(status) != 0) {
            // Handle other non-zero exit codes
            printf("Electron exited with error code %d.\n", WEXITSTATUS(status));
            printf("Are you sure you have downloaded the right release?\n");
            printf("This version of M5Burner was built for Pi-Apps and expects the executable at /opt/M5Burner/bin/m5burner\n");
            send_notification("Electron Error", 
                           "Electron encountered an error and exited. This version of M5Burner was built for Pi-Apps and expects the executable at /opt/M5Burner/M5Burner");
        }
    }
}

int main() {
    const char *electron_app = "/opt/M5Burner/bin/m5burner";

    // Check if the executable exists
    if (access(electron_app, F_OK) == -1) {
        printf("ERROR: M5Burner executable not found at %s\n", electron_app);
        printf("This version of M5Burner was built for Pi-Apps and expects the executable at this location.\n");
        send_notification("M5Burner Error", 
                       "M5Burner executable not found. This version expects the executable at /opt/M5Burner/bin/m5burner");
        exit(EXIT_FAILURE);
    }

    // Check if user is in dialout or uucp group
    if (!is_user_in_group("dialout") && !is_user_in_group("uucp")) {
        printf("ERROR: You need to be in the 'dialout' or 'uucp' group to use M5Burner by allowing your user to access serial devices.\n");
        printf("Run the following command and restart your computer:\n");
        printf("  sudo usermod -aG dialout %s\n", getenv("USER"));

        send_notification("Serial Port Access Issue", 
                       "You need to be in the 'dialout' or 'uucp' group.\nRun:\n  sudo usermod -aG dialout $USER");
        exit(EXIT_FAILURE);
    }

    // Launch M5Burner
    launch_electron(electron_app, 0);

    return 0;
}

