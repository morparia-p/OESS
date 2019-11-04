class PeeringModal {
  constructor(query, peering) {
    let template = document.querySelector('#template-l3-peering-modal');
    this.element = document.importNode(template.content, true);

    this.handleIpVersionChange = this.handleIpVersionChange.bind(this);
    this.display = this.display.bind(this);
    this.hide = this.hide.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.onCancel = this.onCancel.bind(this);

    this.element.querySelector('.cancel-peering-modal-button').addEventListener('click', function(e) {
      this.hide();
    }.bind(this));

    if (peering.isPeeringAutoGenerated) {
      this.element.querySelector(`.cloud-peering-information`).style.display = 'block';

      this.element.querySelector(`.bgp-asn`).value = null;
      this.element.querySelector(`.bgp-asn`).placeholder = 0;
      this.element.querySelector('.bgp-asn').setAttribute('disabled', true);

      this.element.querySelector(`.bgp-key`).value = null;
      this.element.querySelector(`.bgp-key`).placeholder = '';
      this.element.querySelector('.bgp-key').setAttribute('disabled', true);

      this.element.querySelector(`.your-peer-ip`).value = null;
      this.element.querySelector(`.your-peer-ip`).placeholder = '192.168.1.2/31';
      this.element.querySelector(`.your-peer-ip`).setAttribute('disabled', true);

      this.element.querySelector(`.oess-peer-ip`).value = null;
      this.element.querySelector(`.oess-peer-ip`).placeholder = '192.168.1.3/31';
      this.element.querySelector(`.oess-peer-ip`).setAttribute('disabled', true);
    }

    this.parent = document.querySelector(query);
    this.parent.innerHTML = '';
    this.parent.appendChild(this.element);
  }

  onSubmit(f) {
    this.parent.querySelector('.add-peering-modal-button').addEventListener('click', function(e) {
      let ipSelect = this.parent.querySelector(`.ip-version`);
      let ipVersion = parseInt(ipSelect.options[ipSelect.selectedIndex].value);

      let asn = this.parent.querySelector(`.bgp-asn`);
      if (!asn.validity.valid) {
        asn.reportValidity();
        return;
      }
      let yourPeerIP = this.parent.querySelector(`.your-peer-ip`);
      if (!yourPeerIP.validity.valid) {
        yourPeerIP.reportValidity();
        return;
      }
      let key = this.parent.querySelector(`.bgp-key`);
      if (!key.validity.valid) {
        key.reportValidity();
        return;
      }
      let oessPeerIP = this.parent.querySelector(`.oess-peer-ip`);
      if (!oessPeerIP.validity.valid) {
        oessPeerIP.reportValidity();
        return;
      }

      let bfd = this.parent.querySelector('.bfd').checked;

      let peering = {
        ip_version: ipVersion,
        peer_asn: asn.value,
        md5_key: (key.value === '') ? null : key.value,
        local_ip: (oessPeerIP.value === '') ? null : oessPeerIP.value,
        peer_ip: (yourPeerIP.value === '') ? null : yourPeerIP.value,
        operational_state: 'unknown',
        bfd: bfd
      };

      f(peering);
      this.hide();
    }.bind(this));
  }

  onCancel(f) {
    this.parent.querySelector('.cancel-peering-modal-button').addEventListener('click', function(e) {
      f(e);
    }.bind(this));
  }

  handleIpVersionChange(e) {
    let select = this.parent.querySelector(`.ip-version`);
    let ipVersion = parseInt(select.options[select.selectedIndex].value);

    if (ipVersion === 6) {
      asIPv6CIDR(this.parent.querySelector(`.oess-peer-ip`));
      asIPv6CIDR(this.parent.querySelector(`.your-peer-ip`));
    } else {
      asIPv4CIDR(this.parent.querySelector(`.oess-peer-ip`));
      asIPv4CIDR(this.parent.querySelector(`.your-peer-ip`));
    }
  }

  display(peering) {
    if (peering === null) {
      this.parent.querySelector(`.ip-version`).selectedIndex = 0;
      this.parent.querySelector(`.ip-version`).onchange = this.handleIpVersionChange;

      this.parent.querySelector(`.bgp-asn`).value = null;
      this.parent.querySelector(`.bgp-asn`).placeholder = 0;

      this.parent.querySelector(`.bgp-key`).value = null;
      this.parent.querySelector(`.bgp-key`).placeholder = '';

      this.parent.querySelector(`.your-peer-ip`).value = null;
      this.parent.querySelector(`.your-peer-ip`).placeholder = '192.168.1.2/31';

      this.parent.querySelector(`.oess-peer-ip`).value = null;
      this.parent.querySelector(`.oess-peer-ip`).placeholder = '192.168.1.3/31';

      this.parent.querySelector(`.bfd`).checked = false;
    }
    this.handleIpVersionChange();

    $('#add-endpoint-peering-modal').modal('show');
  }

  hide() {
    $('#add-endpoint-peering-modal').modal('hide');
  }
}