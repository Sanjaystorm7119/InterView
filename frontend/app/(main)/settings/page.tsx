"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, User, Mail, CreditCard, Zap, Loader2, CheckCircle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface CreditPackage {
  id: string;
  credits: number;
  price_usd: number;
  label: string;
}

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    api.get("/api/payments/packages").then((r) => setPackages(r.data)).catch(() => {});
  }, []);

  // Handle Stripe redirect back
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      const credits = searchParams.get("credits");
      toast.success(`Payment successful! ${credits} credits added to your account.`);
      refreshUser();
      router.replace("/settings");
    } else if (payment === "cancelled") {
      toast.info("Payment cancelled.");
      router.replace("/settings");
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId);
    try {
      const { data } = await api.post("/api/payments/create-checkout", { package_id: packageId });
      window.location.href = data.checkout_url;
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to start checkout");
      setPurchasing(null);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Profile */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold text-lg">
                {user?.firstname?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-semibold">{user?.name || `${user?.firstname} ${user?.lastname}`}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Name:</span>
                <span>{user?.firstname} {user?.lastname}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Email:</span>
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Credits:</span>
                <span className="font-semibold text-amber-600">{user?.credits ?? 0} remaining</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buy Credits */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold">Buy Credits</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Each credit lets you create one interview. Credits never expire.
          </p>

          {packages.length === 0 ? (
            <p className="text-sm text-gray-400">Loading packages…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`border rounded-xl p-4 flex flex-col gap-2 ${pkg.label === "Growth" ? "border-amber-400 bg-amber-50" : "border-gray-200"}`}
                >
                  {pkg.label === "Growth" && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full self-start">
                      Most Popular
                    </span>
                  )}
                  <p className="font-bold text-lg">{pkg.credits} Credits</p>
                  <p className="text-xs text-gray-500">{pkg.label} Plan</p>
                  <p className="text-xl font-bold text-gray-800">${pkg.price_usd}</p>
                  <p className="text-xs text-gray-400">${(pkg.price_usd / pkg.credits).toFixed(2)} / credit</p>
                  <Button
                    size="sm"
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchasing !== null}
                    className={`mt-1 ${pkg.label === "Growth" ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}`}
                    variant={pkg.label === "Growth" ? "default" : "outline"}
                  >
                    {purchasing === pkg.id ? (
                      <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Redirecting…</>
                    ) : (
                      <>Buy {pkg.credits} Credits</>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            Secure checkout via Stripe. No subscription required.
          </p>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4">Account Actions</h2>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
