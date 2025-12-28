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
  final _audioPlayer = AudioPlayer();
  final MobileScannerController _scannerController = MobileScannerController();
  
  bool _isScanning = true;
  OrderProgress? _progress;
  String? _lastScannedMessage;
  bool _isLoading = false;

  @override
  void dispose() {
    _scannerController.dispose();
    _audioPlayer.dispose();
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
      _isScanning = false; // Pause scanning processing
    });

    try {
      final result = await _service.scanPickItem(widget.order.id, code);
      
      // Play beep sound
      // await _audioPlayer.play(AssetSource('sounds/beep.mp3'));

      setState(() {
        _lastScannedMessage = "${result.item?.productName} - Scanned!";
        _progress = result.progress;
      });

      if (_progress?.isComplete == true) {
        _showCompletionDialog();
      } else {
        // Resume scanning after short delay
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
       // Play error sound
      // await _audioPlayer.play(AssetSource('sounds/error.mp3'));

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

  Future<void> _showCompletionDialog() async {
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Picking Complete!'),
        content: const Text('All items have been picked. Move to packing?'),
        actions: [
          TextButton(
            child: const Text('Cancel'),
            onPressed: () => Navigator.pop(context),
          ),
          ElevatedButton(
            child: const Text('Complete & Exit'),
            onPressed: () async {
              await _service.completePicking(widget.order.id);
              if (!mounted) return;
              Navigator.pop(context); // Close dialog
              Navigator.pop(context, true); // Return to list with success
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
                    case TorchState.auto: // Handle auto case
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
                  
                  // Progress Indicator
                  if (_progress != null) ...[
                    Text(
                      'Progress: ${_progress!.scannedItems} / ${_progress!.totalItems}',
                      style: Theme.of(context).textTheme.headlineSmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: _progress!.scannedItems / _progress!.totalItems,
                      minHeight: 10,
                    ),
                  ] else 
                    const Text('Start scanning items...', textAlign: TextAlign.center),

                  const Divider(height: 32),
                  
                  const Text('Items to Pick:', style: TextStyle(fontWeight: FontWeight.bold)),
                  Expanded(
                    child: FutureBuilder<List<dynamic>>( // In real app, fetch items from API
                        future: Future.value([]), // TODO: Implementation
                        builder: (context, snapshot) {
                            return const Center(child: Text("Scan item barcode to track progress"));
                        }
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
