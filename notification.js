// ==============================================
// Notification System
// ==============================================

const notificationSystem = {
  container: null,
  notificationsEnabled: true,
  timeouts: new Map(),

  init() {
    // Create container if it doesn't exist
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.className = "chnm-notification-container";
      document.body.appendChild(this.container);
    }
  },

  show(message, type = "info", duration = 5000) {
    if (!this.notificationsEnabled) return null;
    if (!this.container) this.init();

    const notification = document.createElement("div");
    notification.className = `chnm-notification ${type}`;

    const icons = {
      info: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"/></svg>`,
      success: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" viewBox="0 0 256 256"><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/></svg>`,
      warning: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"/></svg>`,
      error: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" viewBox="0 0 256 256"><path d="M165.66,101.66,139.31,128l26.35,26.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/></svg>`,
    };

    notification.innerHTML = `
                    <span class="chnm-notification-icon">${
                      icons[type] || icons.info
                    }</span>
                    <span class="chnm-notification-content font-bold">${message}</span>
                    <span class="chnm-notification-close" title="Dismiss">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>
                    </span>
                    <div class="chnm-notification-progress" style="--progress: 1"></div>
                `;

    this.container.prepend(notification);

    // Force reflow to enable animation
    void notification.offsetWidth;

    notification.classList.add("show");

    // Close button handler
    notification
      .querySelector(".chnm-notification-close")
      .addEventListener("click", () => {
        this.hide(notification);
      });

    // Auto-close after duration
    if (duration) {
      const startTime = Date.now();
      const progressBar = notification.querySelector(
        ".chnm-notification-progress"
      );
      let remaining = duration;

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        remaining = duration - elapsed;
        const progress = remaining / duration;
        progressBar.style.setProperty("--progress", progress);
      };

      const animate = () => {
        updateProgress();
        if (remaining > 0) {
          this.timeouts.set(notification, requestAnimationFrame(animate));
        } else {
          this.hide(notification);
        }
      };

      // Start animation
      this.timeouts.set(notification, requestAnimationFrame(animate));

      // Pause on hover
      notification.addEventListener("mouseenter", () => {
        const timeoutId = this.timeouts.get(notification);
        if (timeoutId) {
          cancelAnimationFrame(timeoutId);
          this.timeouts.delete(notification);
        }
      });

      // Resume on mouse leave
      notification.addEventListener("mouseleave", () => {
        if (remaining > 0) {
          const newStartTime = Date.now() - (duration - remaining);
          const newAnimate = () => {
            const elapsed = Date.now() - newStartTime;
            remaining = duration - elapsed;
            const progress = remaining / duration;
            progressBar.style.setProperty("--progress", progress);

            if (remaining > 0) {
              this.timeouts.set(
                notification,
                requestAnimationFrame(newAnimate)
              );
            } else {
              this.hide(notification);
            }
          };

          this.timeouts.set(notification, requestAnimationFrame(newAnimate));
        }
      });
    }

    return notification;
  },

  hide(notification) {
    // Clear any existing animation frame
    const timeoutId = this.timeouts.get(notification);
    if (timeoutId) {
      cancelAnimationFrame(timeoutId);
      this.timeouts.delete(notification);
    }

    notification.classList.remove("show");
    notification.classList.add("hide");
    setTimeout(() => notification.remove(), 300);
  },
};