import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../models/cart_model.dart'; // Using the standard CartItem logic indirectly
import '../screens/product_detail_screen.dart'; // For ProductVariant
import '../services/api_service.dart';

class PosCheckoutScreen extends StatefulWidget {
  final List<ProductVariant> items;

  const PosCheckoutScreen({super.key, required this.items});

  @override
  State<PosCheckoutScreen> createState() => _PosCheckoutScreenState();
}

class _PosCheckoutScreenState extends State<PosCheckoutScreen> {
  final formatter = NumberFormat("#,##0", "en_US");
  bool _isSubmitting = false;

  double get _totalAmount => widget.items.fold(0, (sum, item) => sum + item.price);

  Future<void> _completeOrder() async {
    setState(() => _isSubmitting = true);

    try {
      // Prepare Payload
      // Consolidate Items (e.g., 2x SKU A)
      // Map<VariantID, Quantity>
      final Map<String, int> consolidated = {};
      
      for (var item in widget.items) {
         // Assuming ProductVariant doesn't have a unique runtime ID, but assumes SKU is unique variant
         // However we should probably use ID if available. ProductVariant has .id
         final key = item.id; 
         consolidated[key] = (consolidated[key] ?? 0) + 1;
      }

      final List<Map<String, dynamic>> orderItems = [];
      consolidated.forEach((variantId, quantity) {
        orderItems.add({
          "variant_id": variantId,
          "quantity": quantity
        });
      });

      final payload = {
        "source": "pos",
        "payment_method": "cash",
        "items": orderItems,
        // No shipping address needed for POS
      };

      await ApiService().createPosOrder(payload);

      if (mounted) {
        // Show Success with Continue button
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            contentPadding: const EdgeInsets.all(24),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle, color: Colors.green, size: 64),
                const SizedBox(height: 24),
                Text(
                  'Order Completed!',
                  style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context); // Close dialog
                      Navigator.pop(context, true); // Return to scanner
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      'Continue to scan',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      }

    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create order: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          'Review Order',
          style: GoogleFonts.inter(color: Colors.black, fontWeight: FontWeight.w900),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
      ),
      body: Column(
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: GridView.builder(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 0.8,
                ),
                itemCount: widget.items.length,
                itemBuilder: (context, index) {
                  final item = widget.items[index];
                  // Count quantity of this specific item
                  final quantity = widget.items.where((i) => i.id == item.id).length;
                  
                  return Container(
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey[300]!, width: 1),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Product Image
                        Expanded(
                          child: Stack(
                            children: [
                              ClipRRect(
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                                child: item.imageUrl != null && item.imageUrl!.isNotEmpty
                                  ? Image.network(
                                      item.imageUrl!,
                                      fit: BoxFit.cover,
                                      width: double.infinity,
                                      errorBuilder: (context, error, stackTrace) => 
                                        Container(
                                          color: Colors.grey[200],
                                          child: const Icon(Icons.image, color: Colors.grey),
                                        ),
                                    )
                                  : Container(
                                      color: Colors.grey[200],
                                      child: const Icon(Icons.image, color: Colors.grey),
                                    ),
                              ),
                              // Quantity Badge
                              Positioned(
                                top: 4,
                                right: 4,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.black,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    '$quantity',
                                    style: GoogleFonts.inter(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Price
                        Padding(
                          padding: const EdgeInsets.all(8),
                          child: Text(
                            '${formatter.format(item.price)} Br',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
          
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(blurRadius: 20, color: Colors.black.withOpacity(0.05))],
            ),
            child: SafeArea(
              child: Column(
                children: [
                   Row(
                     mainAxisAlignment: MainAxisAlignment.spaceBetween,
                     children: [
                       Text(
                         'Total',
                         style: GoogleFonts.inter(fontSize: 20, color: Colors.grey[600]),
                       ),
                       Expanded(
                         child: Row(
                           mainAxisAlignment: MainAxisAlignment.center,
                           children: [
                             Text(
                               '${widget.items.length}',
                               style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w900),
                             ),
                           ],
                         ),
                       ),
                       Text(
                         '${formatter.format(_totalAmount)} Br',
                         style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w900),
                       ),
                     ],
                   ),
                   const SizedBox(height: 24),
                   SizedBox(
                     width: double.infinity,
                     height: 60,
                     child: ElevatedButton(
                       onPressed: _isSubmitting ? null : _completeOrder,
                       style: ElevatedButton.styleFrom(
                         backgroundColor: Colors.black,
                         shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                       ),
                       child: _isSubmitting 
                           ? const CircularProgressIndicator(color: Colors.white)
                           : Text(
                             'COMPLETE ORDER',
                             style: GoogleFonts.inter(
                               fontSize: 18,
                               fontWeight: FontWeight.bold,
                               color: Colors.white,
                               letterSpacing: 1.0,
                             ),
                           ),
                     ),
                   ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
