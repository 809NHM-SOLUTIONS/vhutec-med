
// import { useEffect, useRef, useState } from "react";
// import { FiActivity, FiBell } from "react-icons/fi";
// import "./NotificationBell.css";

// export default function NotificationBell({
//   notifications = [],
//   unreadCount = 0,
//   loading = false,
//   error = "",
//   onRefresh,
//   onMarkAsRead,
//   onViewAll,
// }) {
//   const [open, setOpen] = useState(false);
//   const wrapperRef = useRef(null);
//   const unreadNotifications = notifications.filter(
//   (notification) => !notification.readAt
// );
// //   const processedIdsRef = useRef(new Set());

//   // Mark unread notifications as read when the bell is opened.
// //   useEffect(() => {
// //     if (!open || !onMarkAsRead) return;

// //     const unreadNotifications = notifications.filter(
// //       (notification) =>
// //         !notification.readAt &&
// //         !processedIdsRef.current.has(notification.id)
// //     );

// //     unreadNotifications.forEach((notification) => {
// //       processedIdsRef.current.add(notification.id);

// //       Promise.resolve(onMarkAsRead(notification))
// //         .then((success) => {
// //           // Allow a retry if the update failed.
// //           if (success === false) {
// //             processedIdsRef.current.delete(notification.id);
// //           }
// //         })
// //         .catch(() => {
// //           processedIdsRef.current.delete(notification.id);
// //         });
// //     });
// //   }, [open, notifications, onMarkAsRead]);

//   useEffect(() => {
//     if (!open) return undefined;

//     const handleOutsideClick = (event) => {
//       if (
//         wrapperRef.current &&
//         !wrapperRef.current.contains(event.target)
//       ) {
//         setOpen(false);
//       }
//     };

//     const handleEscape = (event) => {
//       if (event.key === "Escape") setOpen(false);
//     };

//     document.addEventListener("mousedown", handleOutsideClick);
//     document.addEventListener("keydown", handleEscape);

//     return () => {
//       document.removeEventListener("mousedown", handleOutsideClick);
//       document.removeEventListener("keydown", handleEscape);
//     };
//   }, [open]);

//   const handleNotificationClick = async (notification) => {
//     if (!notification.readAt && onMarkAsRead) {
//       const success = await onMarkAsRead(notification);
//       if (success === false) return;
//     }

//     setOpen(false);
//     onViewAll?.();
//   };

//   return (
//     <div className="notification-bell-wrapper" ref={wrapperRef}>
//       <button
//         type="button"
//         className="notification-bell-button"
//         aria-label={`Notifications, ${unreadCount} unread`}
//         aria-expanded={open}
//         aria-haspopup="dialog"
//         onClick={() => setOpen((current) => !current)}
//       >
//         <FiBell aria-hidden="true" />

//         {unreadCount > 0 && (
//           <span className="notification-bell-badge">
//             {unreadCount > 99 ? "99+" : unreadCount}
//           </span>
//         )}
//       </button>

//       {open && (
//         <div
//           className="notification-dropdown"
//           role="dialog"
//           aria-label="Recent notifications"
//         >
//           <div className="notification-dropdown-header">
//             <div>
//               <h3>Notifications</h3>
//               <p>
//                 {unreadCount === 0
//                   ? "You're all caught up"
//                   : `${unreadCount} unread notification${
//                       unreadCount === 1 ? "" : "s"
//                     }`}
//               </p>
//             </div>

//             <button
//               type="button"
//               className="notification-refresh-button"
//               onClick={onRefresh}
//               disabled={loading}
//               aria-label="Refresh notifications"
//               title="Refresh notifications"
//             >
//               <FiActivity />
//             </button>
//           </div>

//           <div className="notification-dropdown-list">
//             {loading && notifications.length === 0 ? (
//               <p className="notification-dropdown-state">
//                 Loading notifications...
//               </p>
//             ) : error && notifications.length === 0 ? (
//               <div className="notification-dropdown-state">
//                 <p role="alert">{error}</p>
//                 <button type="button" onClick={onRefresh}>
//                   Try again
//                 </button>
//               </div>
//             ) : unreadNotifications.length === 0 ? (
//               <div className="notification-dropdown-empty">
//                 <FiBell />
//                <strong>No unread notifications</strong>
// <p>You're all caught up. New updates will appear here.</p>
//               </div>
//             ) : (
//               <>
//                 {error && (
//                   <p className="notification-dropdown-error" role="alert">
//                     {error}
//                   </p>
//                 )}

//                 {unreadNotifications.slice(0, 5).map((notification) => (
//                   <button
//                     type="button"
//                     key={notification.id}
//                     className={`notification-dropdown-item ${
//                       notification.readAt ? "is-read" : "is-unread"
//                     }`}
//                     onClick={() => handleNotificationClick(notification)}
//                   >
//                     <span className="notification-item-icon">
//                       <FiBell />
//                     </span>

//                     <span className="notification-item-content">
//                       <strong>{notification.title}</strong>
//                       <span className="notification-item-message">
//                         {notification.message}
//                       </span>
//                       <span className="notification-item-time">
//                         {notification.createdAt
//                           ? new Date(
//                               notification.createdAt
//                             ).toLocaleString("en-ZA", {
//                               dateStyle: "medium",
//                               timeStyle: "short",
//                             })
//                           : "Recently"}
//                       </span>
//                     </span>

//                     {!notification.readAt && (
//                       <span
//                         className="notification-unread-dot"
//                         aria-label="Unread"
//                       />
//                     )}
//                   </button>
//                 ))}
//               </>
//             )}
//           </div>

//           <button
//             type="button"
//             className="notification-view-all-button"
//             onClick={() => {
//               setOpen(false);
//               onViewAll?.();
//             }}
//           >
//             View all notifications
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }




import { useEffect, useRef, useState } from "react";
import { FiActivity, FiBell } from "react-icons/fi";
import "./NotificationBell.css";

const SEEN_IDS_KEY = "notification-bell-seen-ids-v3";

function loadSeenIds() {
  try {
    const raw = window.localStorage.getItem(SEEN_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids) {
  try {
    window.localStorage.setItem(
      SEEN_IDS_KEY,
      JSON.stringify([...ids].slice(-500))
    );
  } catch {
    // Keep the bell usable if browser storage is unavailable.
  }
}

export default function NotificationBell({
  notifications = [],
  unreadCount = 0,
  loading = false,
  error = "",
  onRefresh,
  onMarkAsRead,
  onViewAll,
}) {
  const [open, setOpen] = useState(false);
  const [bellNotifications, setBellNotifications] = useState([]);
  const [seenIds, setSeenIds] = useState(() => loadSeenIds());
  const wrapperRef = useRef(null);

  const closeDropdown = () => {
    setOpen(false);
    setBellNotifications([]);
  };

  // Only hide unread notifications previously viewed in this bell.
  const viewedUnreadCount = notifications.filter(
    (notification) =>
      !notification.readAt &&
      notification.id != null &&
      seenIds.has(String(notification.id))
  ).length;

  const visibleUnreadCount = Math.max(
    0,
    unreadCount - viewedUnreadCount
  );

  const rememberAsSeen = (items) => {
    const updated = loadSeenIds();

    items.forEach((notification) => {
      if (notification.id != null) {
        updated.add(String(notification.id));
      }
    });

    saveSeenIds(updated);
    setSeenIds(updated);
  };

  const toggleDropdown = () => {
    if (open) {
      closeDropdown();
      return;
    }

    setBellNotifications([]);
    setOpen(true);
  };

  // Wait for the data to finish loading before selecting unseen notifications.
  useEffect(() => {
    if (!open || loading) return;

    const currentSeenIds = loadSeenIds();

    const unseen = notifications.filter(
      (notification) =>
        !notification.readAt &&
        notification.id != null &&
        !currentSeenIds.has(String(notification.id))
    );

    if (unseen.length === 0) {
      // Do not repeatedly add IDs while the dropdown is empty.
      return;
    }

    setBellNotifications((current) => {
      const existingIds = new Set(current.map((item) => String(item.id)));
      const additions = unseen.filter(
        (item) => !existingIds.has(String(item.id))
      );

      if (additions.length === 0) return current;

      rememberAsSeen(additions);
      return [...current, ...additions];
    });
  }, [open, loading, notifications]);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        closeDropdown();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") closeDropdown();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleNotificationClick = async (notification) => {
    if (!notification.readAt && onMarkAsRead) {
      try {
        const success = await onMarkAsRead(notification);
        if (success === false) return;
      } catch {
        return;
      }
    }

    closeDropdown();
    onViewAll?.();
  };

  return (
    <div className="notification-bell-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="notification-bell-button"
        aria-label={`Notifications, ${visibleUnreadCount} new`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggleDropdown}
      >
        <FiBell aria-hidden="true" />
        {visibleUnreadCount > 0 && (
          <span className="notification-bell-badge">
            {visibleUnreadCount > 99 ? "99+" : visibleUnreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="notification-dropdown"
          role="dialog"
          aria-label="Recent notifications"
        >
          <div className="notification-dropdown-header">
            <div>
              <h3>Notifications</h3>
              <p>
                {bellNotifications.length === 0
                  ? "You're all caught up"
                  : `${bellNotifications.length} new notification${
                      bellNotifications.length === 1 ? "" : "s"
                    }`}
              </p>
            </div>

            <button
              type="button"
              className="notification-refresh-button"
              onClick={onRefresh}
              disabled={loading}
              aria-label="Refresh notifications"
              title="Refresh notifications"
            >
              <FiActivity />
            </button>
          </div>

          <div className="notification-dropdown-list">
            {loading && notifications.length === 0 ? (
              <p className="notification-dropdown-state">
                Loading notifications...
              </p>
            ) : error && notifications.length === 0 ? (
              <div className="notification-dropdown-state">
                <p role="alert">{error}</p>
                <button type="button" onClick={onRefresh}>
                  Try again
                </button>
              </div>
            ) : bellNotifications.length === 0 ? (
              <div className="notification-dropdown-empty">
                <FiBell />
                <strong>No new notifications</strong>
                <p>
                  You've viewed these updates. New notifications will appear
                  here.
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <p className="notification-dropdown-error" role="alert">
                    {error}
                  </p>
                )}

                {bellNotifications.slice(0, 5).map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    className="notification-dropdown-item is-unread"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <span className="notification-item-icon">
                      <FiBell />
                    </span>

                    <span className="notification-item-content">
                      <strong>{notification.title}</strong>
                      <span className="notification-item-message">
                        {notification.message}
                      </span>
                      <span className="notification-item-time">
                        {notification.createdAt
                          ? new Date(notification.createdAt).toLocaleString(
                              "en-ZA",
                              {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }
                            )
                          : "Recently"}
                      </span>
                    </span>

                    <span
                      className="notification-unread-dot"
                      aria-label="Unread"
                    />
                  </button>
                ))}
              </>
            )}
          </div>

          <button
            type="button"
            className="notification-view-all-button"
            onClick={() => {
              closeDropdown();
              onViewAll?.();
            }}
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
