import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:convert';
import 'package:warehouse_mobile/shared/models/fulfillment_models.dart';
import 'package:warehouse_mobile/shared/services/fulfillment_service.dart';

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

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) async {
    if (_isLoading || !_isScanning) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;
    
    final String? code = barcodes.first.rawValue;
    if (code == null) return;

    setState(() {
      _isLoading = true;
      _isScanning = false;
    });

    try {
      final result = await _service.scanPackItem(widget.order.id, code);
      
      setState(() {
        _lastScannedMessage = "${result.item?.productName} - Packed!";
        _progress = result.progress;
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
      
      setState(() {
        _isScanning = true;
        _isLoading = false;
      });
    }
  }

  Future<void> _printLabel() async {
    try {
      final zpl = await _service.getZplLabel(widget.order.id);
      
      // In a real mobile app, you would send this to a networked printer
      // via TCP/IP or Bluetooth.
      // For this demo, we'll just show it or "share" it.
      print("Printing Label:\n$zpl");
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Label generated. Sending to printer...')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to print label: $e')),
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
                      value: _progress!.scannedItems / _progress!.totalItems,
                      minHeight: 10,
                      backgroundColor: Colors.grey.shade200,
                      color: Colors.blue,
                    ),
                  ] else 
                    const Text('Scan items to verify before packing', textAlign: TextAlign.center),

                  const Spacer(),
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
