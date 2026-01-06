import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:warehouse_mobile/shared/models/fulfillment_models.dart';
import 'package:warehouse_mobile/shared/services/fulfillment_service.dart';

class PickingScreen extends StatefulWidget {
  final FulfillmentOrder order;

  const PickingScreen({super.key, required this.order});

  @override
  State<PickingScreen> createState() => _PickingScreenState();
}

class _PickingScreenState extends State<PickingScreen> {
  final _service = FulfillmentService();
  final MobileScannerController _scannerController = MobileScannerController();
  
  bool _isScanning = true;
  OrderProgress? _progress;
  String? _lastScannedMessage;
  bool _isLoading = false;
  List<DetailsItem> _items = [];

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
            scannedItems: details.totals.pickedItems,
            isComplete: details.totals.pickedItems >= details.totals.totalItems,
          );
          _isLoading = false;
        });

        if (_progress?.isComplete == true) {
            // If already complete, show completion dialog immediately?
            // Or just show button to complete.
            // Let's show a snackbar and the button.
            ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Order already fully picked!')),
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
    if (_isLoading || !_isScanning) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final String? code = barcodes.first.rawValue;
    if (code == null) return;

    // Local check: if already complete getting 400 error is annoying.
    if (_progress?.isComplete == true) {
        return; 
    }

    setState(() {
      _isLoading = true;
      _isScanning = false; 
    });

    try {
      final result = await _service.scanPickItem(widget.order.id, code);
      
      setState(() {
        _lastScannedMessage = "${result.item?.productName} - Scanned!";
        _progress = result.progress;
        // Update local item list to show checkmark
        final index = _items.indexWhere((i) => i.sku == code);
        if (index != -1) {
            // Optimistic update of local list (though quantity logic is complex, backend handles generic progress)
            // Ideally we'd re-fetch details or patch local state better.
            _loadOrderDetails(); // Refresh list to get accurate item states
        }
      });

      if (_progress?.isComplete == true) {
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
      
      // Play error sound (when we enable audio)
      // await _audioPlayer.play(AssetSource('sounds/error.mp3'));

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
                title: const Text('Already Scanned! ⚠️', style: TextStyle(color: Colors.orange)),
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

  Future<void> _showCompletionDialog() async {
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Picking Complete!'),
        content: const Text('All items have been picked. Move to packing?'),
        actions: [
          TextButton(
            child: const Text('Stay Here'),
            onPressed: () => Navigator.pop(context),
          ),
          ElevatedButton(
            child: const Text('Complete & Exit'),
            onPressed: () async {
              await _service.completePicking(widget.order.id);
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
        title: Text('Picking Order #${widget.order.orderNumber}'),
        actions: [
            IconButton(
              icon: ValueListenableBuilder(
                valueListenable: _scannerController,
                builder: (context, state, child) {
                  switch (state.torchState) {
                    case TorchState.off:
                      return const Icon(Icons.flash_off, color: Colors.grey);
                    case TorchState.on:
                      return const Icon(Icons.flash_on, color: Colors.yellow);
                    case TorchState.auto:
                       return const Icon(Icons.flash_auto, color: Colors.white);
                    case TorchState.unavailable:
                       return const Icon(Icons.no_flash, color: Colors.grey);
                  }
                },
              ),
              onPressed: () => _scannerController.toggleTorch(),
            ),
             IconButton(
              icon: ValueListenableBuilder(
                valueListenable: _scannerController,
                builder: (context, state, child) {
                  switch (state.cameraDirection) {
                    case CameraFacing.back:
                      return const Icon(Icons.camera_front);
                    case CameraFacing.front:
                      return const Icon(Icons.camera_rear);
                  }
                },
              ),
              onPressed: () => _scannerController.switchCamera(),
            ),
        ],
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
                      color: Colors.green.shade100,
                      child: Text(
                        _lastScannedMessage!,
                        style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  const SizedBox(height: 16),
                  
                  if (_progress != null) ...[
                    Text(
                      'Progress: ${_progress!.scannedItems} / ${_progress!.totalItems}',
                      style: Theme.of(context).textTheme.headlineSmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: _progress!.totalItems > 0 
                        ? _progress!.scannedItems / _progress!.totalItems 
                        : 0,
                      minHeight: 10,
                    ),
                  ] else if (_isLoading)
                     const Center(child: CircularProgressIndicator())
                  else
                    const Text('Start scanning items...', textAlign: TextAlign.center),

                  const Divider(height: 32),
                  
                  const Text('Items to Pick:', style: TextStyle(fontWeight: FontWeight.bold)),
                  Expanded(
                    child: _items.isEmpty 
                    ? const Center(child: Text("Loading items..."))
                    : ListView.builder(
                        itemCount: _items.length,
                        itemBuilder: (context, index) {
                            final item = _items[index];
                            return ListTile(
                                leading: Icon(
                                    item.picked ? Icons.check_circle : Icons.circle_outlined,
                                    color: item.picked ? Colors.green : Colors.grey,
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
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                        child: const Text("Order Complete - Finish"),
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
