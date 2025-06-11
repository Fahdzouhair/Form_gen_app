sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";

  return Controller.extend("appgenform.controller.MainView", {

    onInit: function() {},

    onGeneratePdf: function() {
      var oView   = this.getView();
      var sAccDoc = oView.byId("inpAccDoc").getValue();
      var sCom    = oView.byId("inpCom").getValue();

      if (!sAccDoc || !sCom) {
        MessageToast.show("Veuillez remplir les deux paramètres.");
        return;
      }

      var sKey   = "ZCDS_PIECE(p_accdoc='" + sAccDoc + "',p_com='" + sCom + "')";
      var oModel = oView.getModel();

      oModel.read("/" + sKey + "/Set", {
        success: function(oData) {
          var raw = (oData.results && oData.results.length) ? oData.results : [oData];
          var aNorm = raw.map(function(r) {
            var dt = new Date(r.docdate);
            var editionStr = isNaN(dt.getTime()) ? "" : dt.toLocaleDateString('fr-FR');
            return {
              invoiceNo:     r.AccountingDocument || "",
              editionDate:   editionStr,
              account:       r.CompanyCode || "",
              phone:         r.TelephoneNumber1 || "",
              fax:           r.FaxNumber          || "",
              clientName:    r.CustomerFullName || r.BPCustomerFullName || "",
              clientAddress1:r.Street            || "",
              clientAddress2:r.City              || "",
              ice:           r.ICE               || "",
              itemCode:      r.ItemCode || r.ProductID || "",
              itemDesc:      r.Designation || r.AccountingDocumentHeaderText || "",
              itemDate:      editionStr,
              totalHT:       parseFloat(r.TaxBaseAmountInCoCodeCrcy  || 0),
              vat:           parseFloat(r.TaxAmountInCoCodeCrcy      || 0),
              totalTTC:      parseFloat(r.TaxBaseAmountInCoCodeCrcy  || 0) + parseFloat(r.TaxAmountInCoCodeCrcy || 0),
              amountInWords: r.AmountInWords || r.MontantLettres || "",
              dueDate:       r.DueDate ? new Date(r.DueDate).toLocaleDateString('fr-FR') : "",
              paymentTerms:  r.PaymentTerms || "",
              bankLabel:     r.BankName || r.Banque || "",
              ribCode:       r.RIBCode  || r.RIB    || ""
            };
          });
          this._createPdf(aNorm);
        }.bind(this),
        error: function() {
          MessageToast.show("Erreur lors de la lecture des données.");
        }
      });
    },

    _createPdf: function(aData) {
      var doc    = new jsPDF({ unit: 'mm', format: 'a4' });
      var w      = doc.internal.pageSize.getWidth();
      var margin = 15;
      var item   = aData[0] || {};

      
      // 2) TITRE
      doc.setFontSize(14).setFont('helvetica', 'bold')
         .text("Facture " + (item.invoiceNo || ''), w - margin, 18, { align: 'right' });

      // 3) BLOC ENTREPRISE (toujours 6 lignes)
      doc.setFontSize(9).setFont('helvetica', 'normal');
      var compInfo = [
        "Tractafric Equipment",
        "Caterpillar Service Center",
        "Date d'édition : " + (item.editionDate || ''),
        "Votre compte : "    + (item.account || ''),
        "Tél : "             + (item.phone || ''),
        "Fax : "             + (item.fax || '')
      ];
      doc.text(compInfo, margin, 30);

      // 4) BLOC CLIENT (toujours 4 lignes)
      var cliInfo = [
        item.clientName || '',
        item.clientAddress1 || '',
        item.clientAddress2 || '',
        "ICE : " + (item.ice || '')
      ];
      doc.text(cliInfo, w - margin - 20, 30, { align: 'right' });

      // 5) SEPARATEUR
      var ySep = 60;
      doc.setLineDash([2,1], 0);
      doc.line(margin, ySep, w - margin, ySep);
      doc.setLineDash([]);

      // 6) ENTETE TABLE
      var headerY = ySep + 8;
      doc.setFontSize(10).setFont('helvetica','bold');
      doc.text("Désignation", margin, headerY);
      doc.text("Date", w - margin, headerY, { align: 'right' });
      doc.setLineWidth(0.4)
         .line(margin, headerY + 2, w - margin, headerY + 2);

      // 7) DETAIL
      var rowY = headerY + 10;
      doc.setLineWidth(0.3)
         .line(margin, rowY - 2, w - margin, rowY - 2);
      doc.setFontSize(9).setFont('helvetica','normal');
      // code + description
      var lineText = (item.itemCode ? item.itemCode + " " : '') + (item.itemDesc || '');
      doc.text(lineText, margin, rowY);
      doc.text(item.itemDate || '', w - margin - 10, rowY, { align: 'right' });
      doc.line(margin, rowY + 2, w - margin, rowY + 2);

      // 8) TOTAUX
      var ty = rowY + 16;
      var tx = w - margin - 50;
      doc.setFontSize(10);
      doc.setFont('helvetica','bold')
         .text("Montant H.T. :", tx, ty)
         .text((item.totalHT || 0).toFixed(2) + " MAD", w - margin, ty, { align: 'right' });
      ty += 6;
      doc.setFont('helvetica','normal')
         .text("TVA 20,00 % :", tx, ty)
         .text((item.vat || 0).toFixed(2) + " MAD", w - margin, ty, { align: 'right' });
      ty += 6;
      doc.setFont('helvetica','bold')
         .text("Montant T.T.C. :", tx, ty)
         .text((item.totalTTC || 0).toFixed(2) + " MAD", w - margin, ty, { align: 'right' });

      // 9) MONTANT EN LETTRES
      var lettersY = ty + 12;
      doc.setTextColor(255,0,0).setFontSize(9).setFont('helvetica','bold')
         .text("Montant en lettres : " + (item.amountInWords || ''), margin, lettersY);
      doc.setTextColor(0,0,0);

      // 10) CONDITIONS
      var footY = lettersY + 10 + 10; // espace
      var terms = [
        "Modalité et condition de règlement :",
        "Échéance : " + (item.dueDate || ''),
        item.paymentTerms || '',
        "Valeur en notre compte " + (item.bankLabel || ''),
        item.ribCode || ''
      ];
      doc.setFontSize(9).setFont('helvetica','normal')
         .text(terms, margin, footY);

      // 11) ACTION
      var lastY = footY + terms.length * 6 + 20;
      doc.setTextColor(255,0,0).setFontSize(9).setFont('helvetica','bold')
         .text("Lister plusieurs comptes bancaires", margin, lastY);
      doc.setTextColor(0,0,0);

      doc.save("Facture_" + (item.invoiceNo || '') + ".pdf");
    }

  });
});
