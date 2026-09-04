import { useNavigate, useLocation } from "react-router-dom";
import {
  UserCircle,
  ImageIcon,
  PackageOpenIcon,
  CarFrontIcon,
  CoinsIcon,
  UserCircle2Icon,
  BugIcon,
  HelpCircleIcon,
  ScanEyeIcon,
  Wrench,
  Ticket,
  LayoutDashboard,
} from "lucide-react";
const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menu = [
    {
      section: "Main Menu",
      items: [
        { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Customer Profiles", icon: UserCircle, path: "/customer-profile" },
        { label: "Mechanic Profiles", icon: UserCircle2Icon, path: "/mechanic-profile" },
      ],
    },
    {
      section: "Management",
      items: [
        { label: "Add Banner", icon: ImageIcon, path: "/add-banner" },
        { label: "Add Review", icon: ScanEyeIcon, path: "/add-review" },
        { label: "Create Services", icon: CarFrontIcon, path: "/service" },
        { label: "Add Spare Parts", icon: Wrench, path: "/job-part" },
        { label: "SOS Vehicle Issues", icon: ScanEyeIcon, path: "/visible-issues" },
        { label: "Create Subscription", icon: CoinsIcon, path: "/plan" },
        { label: "Mechanic Services", icon: PackageOpenIcon, path: "/mechanicaservices" },
        { label: "Landing Bookings", icon: PackageOpenIcon, path: "/customer-booking" },
        { label: "Service Tickets", icon: Ticket, path: "/service-tickets" },
        { label: "Assign Mechanic", icon: Wrench, path: "/admin-assign-mechanic" },
      ],
    },
    {
      section: "Support",
      items: [{ label: "Support Tickets", icon: HelpCircleIcon, path: "/help" },
      { label: "Disputes", icon: BugIcon, path: "/dispute" },
      ],

    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    toggleSidebar();
  };

  return (
    <div
      className={`fixed top-0 left-0 h-full w-60 sm:w-64 lg:w-60 bg-white shadow-xl border-r border-gray-200
      transform transition-all duration-300 z-50
      ${isOpen ? "translate-x-0" : "-translate-x-full"}
      lg:${isOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b">
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <h1 className="text-md font-bold  text-black tracking-wide">
              BOOK MY MECHANiK<span className="align-top text-md ml-0">™</span>
            </h1>
            <p className="text-[10px] text-gray-500 -mt-1">
              Admin Panel
            </p>
          </div>
        </div>
        <button
          className="text-gray-600 text-lg hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors lg:hidden"
          onClick={toggleSidebar}
        >
          ✕
        </button>
      </div>

      {/* MENU */}
      <div className="px-4 py-3 overflow-y-auto h-[calc(100%-70px)]">
        {menu.map((section, index) => (
          <div key={index} className="mb-5">
            <p className="uppercase text-[11px] text-gray-400 font-semibold mb-2">
              {section.section}
            </p>

            <div className="space-y-[2px]">
              {section.items.map((item, i) => {
                const active = location.pathname === item.path;

                return (
                  <button
                    key={i}
                    onClick={() => handleNavigation(item.path)}
                    className={`flex items-center gap-3 w-full px-2 sm:px-3 py-2
                      rounded-md text-xs sm:text-sm transition-all
                      ${active
                        ? "bg-red-600 text-white font-medium shadow-sm"
                        : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                      }`}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
