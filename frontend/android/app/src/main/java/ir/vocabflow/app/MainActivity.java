package ir.vocabflow.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  // registerPlugin must run BEFORE super.onCreate(): the bridge (and its
  // plugin registry) is built inside super.onCreate → load().
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(SafeAreaPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
