import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../screens/product_detail_screen.dart'; // For ProductVariant
import 'pos_checkout_screen.dart';

class PosScannerScreen extends StatefulWidget {
  const PosScannerScreen({super.key});

  @override
  State<PosScannerScreen> createState() => _PosScannerScreenState();
}

class _PosScannerScreenState extends State<PosScannerScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    returnImage: false,
  );
  
  // POS Cart State
  List<ProductVariant> _cartItems = [];
  bool _isProcessing = false;
  ProductVariant? _lastScanned;
  String? _lastError;
  Timer? _messageTimer;

  final formatter = NumberFormat("#,##0", "en_US");

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _controller.dispose();
    _messageTimer?.cancel();
    super.dispose();
  }


  void _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final String? code = barcodes.first.rawValue;
    if (code == null || code.isEmpty) return;

    setState(() => _isProcessing = true);

    try {
      // 1. Fetch Item
      final variant = await ApiService().getVariantBySku(code);

      if (mounted) {
        if (variant != null) {
          // 2. Add to Cart
          setState(() {
            _cartItems.add(variant);
            _lastScanned = variant;
            _lastError = null;
          });
          
          // Feedback
          ScaffoldMessenger.of(context).hideCurrentSnackBar();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Added: ${variant.name}'),
              backgroundColor: Colors.green,
              duration: const Duration(milliseconds: 1500),
            ),
          );
        } else {
          // 3. Not Found
          setState(() => _lastError = 'SKU not found: $code');
          
           ScaffoldMessenger.of(context).hideCurrentSnackBar();
           ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Product not found: $code'),
              backgroundColor: Colors.red,
              duration: const Duration(milliseconds: 1500),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _lastError = 'Error scanning');
      }
    } finally {
      // Reset processing after a delay to allow re-scanning different items
      // (detectionSpeed: noDuplicates prevents same code spam, but we enforce a small delay)
      await Future.delayed(const Duration(milliseconds: 1000));
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  double get _totalAmount => _cartItems.fold(0, (sum, item) => sum + item.price);

  void _goToCheckout() async {
    if (_cartItems.isEmpty) return;
     
    // Pause carmera
    await _controller.stop();

    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PosCheckoutScreen(items: _cartItems),
      ),
    );

    // If result is true, order completed -> clear cart
    if (result == true) {
      setState(() {
        _cartItems.clear();
        _lastScanned = null;
        _lastError = null;
      });
    }

    // Resume camera
    try {
      if (!_controller.value.isRunning) {
         await _controller.start();
      }
    } catch (e) {
      // Ignore if already started
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Camera
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
            errorBuilder: (context, error, child) {
              return Center(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  color: Colors.white,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error, color: Colors.red, size: 40),
                      const SizedBox(height: 10),
                      Text(
                        'Camera Error:\n${error.errorCode.name}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.red),
                      ),
                      Text(
                         error.errorDetails?.message ?? '',
                         textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),

          // Overlay: instructions
          Positioned(
            top: 60,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  'Scan Barcode',
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),

          // Overlay: Error Message
          if (_lastError != null)
             Positioned(
              top: 120,
              left: 20,
              right: 20,
              child: Container(
                padding: const EdgeInsets.all(12),
                color: Colors.red.withOpacity(0.8),
                child: Text(
                  _lastError!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
            ),

          // Bottom Sheet: Cart Summary
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                boxShadow: [BoxShadow(blurRadius: 20, color: Colors.black26)],
              ),
               child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                   // Product Thumbnails List
                   if(_cartItems.isNotEmpty) ...[ 
                      SizedBox(
                        height: 100,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: _cartItems.length,
                          itemBuilder: (context, index) {
                            final item = _cartItems[index];
                            // Count quantity of this specific item
                            final quantity = _cartItems.where((i) => i.id == item.id).length;
                            
                            return Padding(
                              padding: const EdgeInsets.only(right: 12),
                              child: Stack(
                                children: [
                                  // Product Image
                                  Container(
                                    width: 100,
                                    height: 100,
                                    decoration: BoxDecoration(
                                      color: Colors.grey[200],
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: Colors.grey[300]!, width: 1),
                                    ),
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(12),
                                      child: item.imageUrl != null && item.imageUrl!.isNotEmpty
                                        ? Image.network(
                                            item.imageUrl!,
                                            fit: BoxFit.cover,
                                            errorBuilder: (context, error, stackTrace) => 
                                              const Icon(Icons.image, color: Colors.grey),
                                          )
                                        : const Icon(Icons.image, color: Colors.grey),
                                    ),
                                  ),
                                  // Remove Button (Red Circle)
                                  Positioned(
                                    top: 4,
                                    left: 4,
                                    child: GestureDetector(
                                      onTap: () {
                                        setState(() {
                                          _cartItems.removeAt(index);
                                        });
                                      },
                                      child: Container(
                                        width: 24,
                                        height: 24,
                                        decoration: const BoxDecoration(
                                          color: Colors.red,
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(
                                          Icons.close,
                                          color: Colors.white,
                                          size: 16,
                                        ),
                                      ),
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
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Divider(),
                      const SizedBox(height: 16),
                   ],

                   // Cart Total
                   Row(
                     mainAxisAlignment: MainAxisAlignment.spaceBetween,
                     children: [
                       Text(
                         'Total',
                         style: GoogleFonts.inter(fontSize: 16, color: Colors.grey[700]),
                       ),
                       Expanded(
                         child: Row(
                           mainAxisAlignment: MainAxisAlignment.center,
                           children: [
                             Text(
                               '${_cartItems.length}',
                               style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w900),
                             ),
                           ],
                         ),
                       ),
                       Text(
                         '${formatter.format(_totalAmount)} Br',
                         style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w900),
                       ),
                     ],
                   ),
                   
                   const SizedBox(height: 24),

                   // Checkout Button
                   SizedBox(
                     width: double.infinity,
                     height: 56,
                     child: ElevatedButton(
                       onPressed: _cartItems.isEmpty ? null : _goToCheckout,
                       style: ElevatedButton.styleFrom(
                         backgroundColor: Colors.black,
                         shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                         elevation: 0,
                       ),
                       child: Text(
                         'Checkout',
                         style: GoogleFonts.inter(
                           fontSize: 18,
                           fontWeight: FontWeight.bold,
                           color: Colors.white,
                         ),
                       ),
                     ),
                   ),
                ],
              ),
            ),
          ),
          
          // Close Button
          Positioned(
            top: 50,
            left: 20,
            child: CircleAvatar(
              backgroundColor: Colors.black54,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
