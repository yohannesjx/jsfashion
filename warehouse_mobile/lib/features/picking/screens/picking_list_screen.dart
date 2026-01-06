import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:warehouse_mobile/shared/models/fulfillment_models.dart';
import 'package:warehouse_mobile/shared/services/fulfillment_service.dart';
import 'picking_screen.dart';

class PickingListScreen extends StatefulWidget {
  const PickingListScreen({super.key});

  @override
  State<PickingListScreen> createState() => _PickingListScreenState();
}

class _PickingListScreenState extends State<PickingListScreen> {
  final _service = FulfillmentService();
  List<FulfillmentOrder> _tasks = [];
  bool _isLoading = true;
  String? _error;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _loadTasks();
    // Auto-refresh every 15 seconds
    _refreshTimer = Timer.periodic(const Duration(seconds: 15), (timer) {
      _checkForNewOrders();
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadTasks() async {
    try {
      final tasks = await _service.getPendingPicking();
      if (mounted) {
        setState(() {
          _tasks = tasks;
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = e.toString();
        });
      }
    }
  }

  Future<void> _checkForNewOrders() async {
    try {
      final newTasks = await _service.getPendingPicking();
      if (!mounted) return;

      // Check if we have new orders by comparing IDs
      final currentIds = _tasks.map((e) => e.id).toSet();
      final newOrderCount = newTasks.where((e) => !currentIds.contains(e.id)).length;

      if (newOrderCount > 0) {
        // Play notification sound/haptic
        await HapticFeedback.heavyImpact();
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('🔔 $newOrderCount New Order(s) Arrived!'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 4),
            action: SnackBarAction(
                label: 'VIEW', 
                textColor: Colors.white,
                onPressed: () {}, // Just closes it, list updates below
            ),
          ),
        );
      }
      
      // Update list silently
      setState(() {
        _tasks = newTasks;
        _error = null;
      });
      
    } catch (e) {
      // disruptive to show error on background poll, just log console
      debugPrint("Auto-refresh error: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('New Orders to Pick'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
                setState(() => _isLoading = true);
                _loadTasks();
            },
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Error: $_error', textAlign: TextAlign.center, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                setState(() => _isLoading = true);
                _loadTasks();
              },
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_tasks.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
             Icon(Icons.checklist_rtl, size: 64, color: Colors.grey),
             SizedBox(height: 16),
             Text('No pending orders', style: TextStyle(fontSize: 18, color: Colors.grey)),
             Text('Waiting for new orders...', style: TextStyle(color: Colors.grey)),
          ],
        )
      );
    }

    return ListView.builder(
      itemCount: _tasks.length,
      itemBuilder: (context, index) {
        final task = _tasks[index];
        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          elevation: 2,
          child: ListTile(
            contentPadding: const EdgeInsets.all(12),
            title: Row(
              children: [
                Text('Order #${task.orderNumber}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                if (task.status == 'picking') ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.amber),
                    ),
                    child: const Text(
                      'In Progress',
                      style: TextStyle(fontSize: 10, color: Colors.brown, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ],
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                 const SizedBox(height: 4),
                 Text('${task.itemCount} Items • ${task.customerName}'),
                 const SizedBox(height: 4),
                 Text('Placed: ${task.createdAt.hour}:${task.createdAt.minute.toString().padLeft(2, '0')}', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
              ],
            ),
            trailing: const Icon(Icons.arrow_forward_ios, color: Colors.grey, size: 16),
            onTap: () => _startPicking(task),
          ),
        );
      },
    );
  }

  Future<void> _startPicking(FulfillmentOrder order) async {
    try {
      await _service.startPicking(order.id);
      if (!mounted) return;
      
      final result = await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => PickingScreen(order: order),
        ),
      );

      if (result == true) {
        setState(() => _isLoading = true);
        _loadTasks();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }
}
