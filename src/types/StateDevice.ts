interface Argument {
  name: string;
  value: string;
}

interface DeviceCommand {
  method: string;
  arguments: Argument[];
}

interface ActionStep {
  command: DeviceCommand;
  input_delay: number;
  output_delay: number;
  repeat: number;
}

interface Action {
  name: string;
  steps: ActionStep[];
}

interface Method {
  name: string;
  signature: string;
}

class StateDevice {
  constructor(
    public name: string,
    public ip: string,
    public token: string,
    public deviceType: string,
    public found: boolean,
    public methods: Method[],
    public actions: Action[]
  ) {}
}
