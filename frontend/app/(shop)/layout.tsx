import { Header } from "@/components/layout/Header";
import { CartDisabledBanner } from "@/components/shop/CartDisabledBanner";

export default function ShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Header />
            <CartDisabledBanner />
            {children}
        </>
    );
}
