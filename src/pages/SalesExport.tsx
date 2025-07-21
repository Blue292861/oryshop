import { useState } from "react";
import { FileSpreadsheet, Calendar, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

type PeriodType = "month" | "year" | "custom";

export default function SalesExport() {
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), "yyyy"));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportSales = async () => {
    setIsExporting(true);
    
    try {
      let startDateStr: string;
      let endDateStr: string;
      let periodLabel: string;

      switch (periodType) {
        case "month":
          const monthDate = new Date(selectedMonth + "-01");
          startDateStr = format(startOfMonth(monthDate), "yyyy-MM-dd");
          endDateStr = format(endOfMonth(monthDate), "yyyy-MM-dd");
          periodLabel = format(monthDate, "MMMM yyyy");
          break;
        case "year":
          const yearDate = new Date(selectedYear + "-01-01");
          startDateStr = format(startOfYear(yearDate), "yyyy-MM-dd");
          endDateStr = format(endOfYear(yearDate), "yyyy-MM-dd");
          periodLabel = selectedYear;
          break;
        case "custom":
          if (!startDate || !endDate) {
            toast({
              title: "Erreur",
              description: "Veuillez sélectionner une date de début et de fin.",
              variant: "destructive",
            });
            return;
          }
          startDateStr = startDate;
          endDateStr = endDate;
          periodLabel = `${format(new Date(startDate), "dd/MM/yyyy")} - ${format(new Date(endDate), "dd/MM/yyyy")}`;
          break;
      }

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDateStr + 'T00:00:00')
        .lte('created_at', endDateStr + 'T23:59:59')
        .eq('status', 'completed');
      
      if (error) throw error;

      // Récupérer les informations des produits séparément
      const itemIds = orders?.map(order => order.item_id).filter(Boolean) || [];
      const { data: shopItems } = await supabase
        .from('shop_items')
        .select('id, name, category, product_id')
        .in('id', itemIds);

      if (!orders || orders.length === 0) {
        toast({
          title: "Aucune vente",
          description: `Aucune vente trouvée pour la période sélectionnée.`,
        });
        return;
      }

      const exportData = orders.map(order => {
        const shopItem = shopItems?.find(item => item.id === order.item_id);
        return {
          'Date de vente': format(new Date(order.created_at), 'dd/MM/yyyy HH:mm'),
          'Nom du produit': order.item_name,
          'Catégorie': shopItem?.category || 'N/A',
          'Identifiant produit': shopItem?.product_id || 'N/A',
          'Prix (€)': (order.price / 100).toFixed(2),
          'ID Commande': order.id,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventes');
      
      const fileName = `ventes_${periodLabel.replace(/\s+/g, '_').replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Export réussi",
        description: `${orders.length} vente(s) exportée(s) pour la période ${periodLabel}.`,
      });

    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'export.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6" />
              Export des ventes
            </CardTitle>
            <CardDescription>
              Sélectionnez la période pour laquelle vous souhaitez extraire les données de ventes
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="period-type">Type de période</Label>
                <Select value={periodType} onValueChange={(value: PeriodType) => setPeriodType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type de période" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Mois</SelectItem>
                    <SelectItem value="year">Année</SelectItem>
                    <SelectItem value="custom">Période personnalisée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {periodType === "month" && (
                <div>
                  <Label htmlFor="month">Mois</Label>
                  <Input
                    id="month"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
              )}

              {periodType === "year" && (
                <div>
                  <Label htmlFor="year">Année</Label>
                  <Input
                    id="year"
                    type="number"
                    min="2020"
                    max="2030"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  />
                </div>
              )}

              {periodType === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Date de début</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">Date de fin</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button 
              onClick={exportSales} 
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? (
                <>
                  <Calendar className="mr-2 h-4 w-4 animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter les ventes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}