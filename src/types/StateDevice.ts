interface Argument {
  name: string;
  value: string;
}

interface Action {
  name: string;
  method: string;
  arguments: Argument[];
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
