import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:convert';
import 'package:warehouse_mobile/shared/models/fulfillment_models.dart';
import 'package:warehouse_mobile/shared/services/fulfillment_service.dart';
import 'label_preview_screen.dart';

class PackingScreen extends StatefulWidget {
  final FulfillmentOrder order;

  const PackingScreen({super.key, required this.order});

  @override
  State<PackingScreen> createState() => _PackingScreenState();
}

class _PackingScreenState extends State<PackingScreen> {
  final _service = FulfillmentService();
  final MobileScannerController _scannerController = MobileScannerController();
  
  bool _isScanning = true;
  OrderProgress? _progress;
  String? _lastScannedMessage;
  bool _isLoading = false;
  List<DetailsItem> _items = [];
  String? _lastScannedCode; // Track last scanned code
  DateTime? _lastScanTime; // Track last scan time

  @override
  void initState() {
    super.initState();
    _loadOrderDetails();
  }

  Future<void> _loadOrderDetails() async {
    setState(() => _isLoading = true);
    try {
      final details = await _service.getOrderDetails(widget.order.id);
      if (mounted) {
        setState(() {
          _items = details.items;
          _progress = OrderProgress(
            totalItems: details.totals.totalItems,
            scannedItems: details.totals.packedItems,
            isComplete: details.totals.packedItems >= details.totals.totalItems,
          );
          _isLoading = false;
        });

        if (_progress?.isComplete == true) {
            ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Order already fully packed!')),
            );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading details: $e')),
        );
      }
    }
  }

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) async {
    // Prevent processing if already loading or scanning is disabled
    if (_isLoading || !_isScanning) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;
    
    final String? code = barcodes.first.rawValue;
    if (code == null || code.isEmpty) return;
    
    // Debounce: Ignore if same code scanned within 2 seconds
    final now = DateTime.now();
    if (_lastScannedCode == code && 
        _lastScanTime != null && 
        now.difference(_lastScanTime!).inSeconds < 2) {
      return;
    }
    
    // Update last scan tracking
    _lastScannedCode = code;
    _lastScanTime = now;
    
    // Process the scan
    await _handleScan(code);
  }

  Future<void> _handleScan(String code) async {

   // Local check
    if (_progress?.isComplete == true) {
        return; 
    }

    setState(() {
      _isLoading = true;
      _isScanning = false;
    });

    try {
      final result = await _service.scanPackItem(widget.order.id, code);
      
      setState(() {
        _lastScannedMessage = "${result.item?.productName} - Packed!";
        _progress = result.progress;
        
        final index = _items.indexWhere((i) => i.sku == code);
        if (index != -1) {
             _loadOrderDetails(); 
        }
      });

      if (_progress?.isComplete == true) {
        // Automatically fetch and print label
        await _printLabel();
        if(!mounted) return;
        _showCompletionDialog();
      } else {
        Future.delayed(const Duration(seconds: 1), () {
          if (mounted) {
            setState(() {
              _isScanning = true;
              _isLoading = false;
            });
          }
        });
      }
    } catch (e) {
      if (!mounted) return;
      
      final errorMsg = e.toString();

      if (errorMsg.contains("SKU not found")) {
         await showDialog(
            context: context,
            builder: (context) => AlertDialog(
                title: const Text('Wrong Product! ❌', style: TextStyle(color: Colors.red)),
                content: const Text('This item is NOT in the current order.\nPlease check the product and try again.'),
                actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('OK'),
                    )
                ],
            ),
         );
      } else if (errorMsg.contains("Already scanned")) {
           await showDialog(
            context: context,
            builder: (context) => AlertDialog(
                title: const Text('Already Packed! ⚠️', style: TextStyle(color: Colors.orange)),
                content: Text(errorMsg.replaceAll('Exception: ', '')),
                actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('OK'),
                    )
                ],
            ),
         );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $errorMsg'), backgroundColor: Colors.red),
        );
      }
      
      setState(() {
        _isScanning = true;
        _isLoading = false;
      });
    }
  }

  Future<void> _printLabel() async {
    try {
      final zpl = await _service.getZplLabel(widget.order.id);
      
      if (!mounted) return;
      
      // Navigate to preview screen
      final shouldPrint = await Navigator.push<bool>(
        context,
        MaterialPageRoute(
          builder: (context) => LabelPreviewScreen(
            zplCode: zpl,
            orderData: {
              'order_number': widget.order.orderNumber,
              'tracking_number': widget.order.trackingNumber,
              'customer_name': widget.order.customerName,
              'shipping_address': 'Address will be loaded from order details',
              'phone': '',
            },
          ),
        ),
      );
      
      if (shouldPrint == true && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Label sent to printer ✓'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to generate label: $e')),
      );
    }
  }

  Future<void> _showCompletionDialog() async {
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Packing Complete!'),
        content: const Text('All items packed. Label generated. Mark as ready for pickup?'),
        actions: [
          TextButton(
            child: const Text('Reprint Label'),
            onPressed: () => _printLabel(),
          ),
          ElevatedButton(
            child: const Text('Finish'),
            onPressed: () async {
              await _service.completePacking(widget.order.id);
              if (!mounted) return;
              Navigator.pop(context); 
              Navigator.pop(context, true);
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Packing Order #${widget.order.orderNumber}'),
      ),
      body: Column(
        children: [
          Expanded(
            flex: 2,
            child: MobileScanner(
              controller: _scannerController,
              onDetect: _onDetect,
            ),
          ),
          Expanded(
            flex: 3,
            child: Container(
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                   if (_lastScannedMessage != null)
                    Container(
                      padding: const EdgeInsets.all(8),
                      color: Colors.blue.shade100,
                      child: Text(
                        _lastScannedMessage!,
                        style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  const SizedBox(height: 16),
                  
                  if (_progress != null) ...[
                    Text(
                      'Packed: ${_progress!.scannedItems} / ${_progress!.totalItems}',
                      style: Theme.of(context).textTheme.headlineSmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: _progress!.totalItems > 0 
                        ? _progress!.scannedItems / _progress!.totalItems
                        : 0,
                      minHeight: 10,
                      backgroundColor: Colors.grey.shade200,
                      color: Colors.blue,
                    ),
                  ] else if (_isLoading)
                     const Center(child: CircularProgressIndicator())
                  else
                    const Text('Scan items to verify before packing', textAlign: TextAlign.center),

                  const Divider(height: 32),
                  
                  const Text('Items to Pack:', style: TextStyle(fontWeight: FontWeight.bold)),
                  Expanded(
                    child: _items.isEmpty 
                    ? const Center(child: Text("Loading items..."))
                    : ListView.builder(
                        itemCount: _items.length,
                        itemBuilder: (context, index) {
                            final item = _items[index];
                            return ListTile(
                                leading: Icon(
                                    item.packed ? Icons.check_circle : Icons.circle_outlined,
                                    color: item.packed ? Colors.blue : Colors.grey,
                                ),
                                title: Text(item.productName),
                                subtitle: Text("${item.variantName}\nQty: ${item.quantity}"),
                                trailing: Text(item.sku, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                            );
                        },
                    ),
                  ),

                  if (_progress?.isComplete == true)
                    ElevatedButton(
                        onPressed: () => _showCompletionDialog(),
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white),
                        child: const Text("Packing Complete - Finish"),
                    ),
  
                  if (_progress?.isComplete != true)
                    ElevatedButton.icon(
                        onPressed: _printLabel,
                        icon: const Icon(Icons.print),
                        label: const Text('Manually Print Label'),
                        style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.all(16),
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
