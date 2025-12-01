import { LayoutDashboard, ShoppingBag, Users, BarChart3, Settings, Tag, Percent, Package } from "lucide-react";
import { NavGroup } from "@/types/preferences/layout";

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Menu",
    items: [
      {
        title: "Dashboard",
        url: "/admin",
        icon: LayoutDashboard,
      },
      {
        title: "Products",
        url: "/admin/products",
        icon: Tag,
      },
      {
        title: "Categories",
        url: "/admin/categories",
        icon: Tag,
      },
      {
        title: "Orders",
        url: "/admin/orders",
        icon: ShoppingBag,
      },
      {
        title: "Customers",
        url: "/admin/customers",
        icon: Users,
      },
      {
        title: "Analytics",
        url: "/admin/analytics",
        icon: BarChart3,
      },
      {
        title: "Discounts",
        url: "/admin/coupons",
        icon: Percent,
      },
      {
        title: "Inventory",
        url: "/admin/inventory",
        icon: Package,
      },
    ],
  },
  {
    id: 2,
    label: "Settings",
    items: [
      {
        title: "General",
        url: "/admin/settings",
        icon: Settings,
        subItems: [
          {
            title: "General",
            url: "/admin/settings",
          },
          {
            title: "Team",
            url: "/admin/settings/team",
          },
          {
            title: "Profile",
            url: "/admin/settings/profile",
          }
        ]
      },
    ],
  },
];
