import { SidebarContent, SidebarContentProps } from "./SidebarContent";

export function Sidebar(props: SidebarContentProps) {
    return (
        <aside className="hidden md:flex w-72 h-screen shrink-0 sticky top-0">
            <SidebarContent {...props} className="w-full" />
        </aside>
    );
}
