document.addEventListener('DOMContentLoaded', function() {
  sessionStorage.setItem('endpoints', '[]');

  loadUserMenu().then(function() {
      loadVRF();
      setDateTimeVisibility();
  });

  let addNetworkEndpoint = document.querySelector('#add-network-endpoint');
  addNetworkEndpoint.addEventListener('click', addNetworkEndpointCallback);

  let addNetworkSubmit = document.querySelector('#add-network-submit');
  addNetworkSubmit.addEventListener('click', addNetworkSubmitCallback);

  let addNetworkCancel = document.querySelector('#add-network-cancel');
  addNetworkCancel.addEventListener('click', addNetworkCancelCallback);

  let url = new URL(window.location.href);
  let id = url.searchParams.get('prepop_vrf_id');
  if (id) {
      showAndPrePopulateEndpointSelectionModal(id);
  }
});

async function loadVRF() {
  let url = new URL(window.location.href);
  let id = url.searchParams.get('vrf_id');
  let vrf = await getVRF(id);
  console.log(vrf);

  let description = document.querySelector('#description');
  description.value = vrf.description;

  let endpoints = [];

  vrf.endpoints.forEach(function(e) {
    let endpoint = {
        cloud_account_id: e.cloud_account_id,
        bandwidth: e.bandwidth,
        entity_id: e.entity.entity_id,
        entity: e.entity.name,
        name: e.interface.name,
        node: e.node.name,
        peerings: [],
        tag: e.tag,
        interface: e.interface.name
    };

    e.peers.forEach(function(p) {
      let peering = {
          asn: p.peer_asn,
          key: p.md5_key || '',
          oessPeerIP: p.local_ip,
          yourPeerIP: p.peer_ip
      };
      endpoint.peerings.push(peering);
    });

    endpoints.push(endpoint);
  });

  sessionStorage.setItem('endpoints', JSON.stringify(endpoints));
  sessionStorage.setItem('vrf',JSON.stringify(vrf));
  loadSelectedEndpointList();
}

async function addNetworkEndpointCallback(event) {
    showEndpointSelectionModal(null);
}

async function modifyNetworkEndpointCallback(index) {
    let endpoints = JSON.parse(sessionStorage.getItem('endpoints'));
    endpoints[index].index = index;

    showEndpointSelectionModal(endpoints[index], {vrf: JSON.parse(sessionStorage.getItem('vrf'))});
}

async function deleteNetworkEndpointCallback(index) {
    let entity = document.querySelector(`#enity-${index}`);

    let endpoints = JSON.parse(sessionStorage.getItem('endpoints'));
    endpoints.splice(index, 1);
    sessionStorage.setItem('endpoints', JSON.stringify(endpoints));

    loadSelectedEndpointList();
}

async function addNetworkSubmitCallback(event) {
    if (!document.querySelector('#description').validity.valid) {
        document.querySelector('#description').reportValidity();
        return null;
    }

    let provisionTime = -1;
    if (document.querySelector('input[name=provision-time]:checked').value === 'later') {
        let date = new Date(document.querySelector('#provision-time-picker').value);
        provisionTime = date.getTime();
    }

    let removeTime = -1;
    if (document.querySelector('input[name=remove-time]:checked').value === 'later') {
        let date = new Date(document.querySelector('#remove-time-picker').value);
        removeTime = date.getTime();
    }

    let addNetworkLoadingModal = $('#add-network-loading');
    addNetworkLoadingModal.modal('show');

    let url = new URL(window.location.href);
    let id = url.searchParams.get('vrf_id');

    let vrfID = await provisionVRF(
        session.data.workgroup_id,
        document.querySelector('#description').value,
        document.querySelector('#description').value,
        JSON.parse(sessionStorage.getItem('endpoints')),
        provisionTime,
        removeTime,
        id
    );

    if (vrfID === null) {
        addNetworkLoadingModal.modal('hide');
    } else {
        window.location.href = `index.cgi?action=view_l3vpn&vrf_id=${vrfID}`;
    }
}

async function addNetworkCancelCallback(event) {
    window.location.href = 'index.cgi?action=welcome';
}

async function addEntitySubmitCallback(event) {
    let name = document.querySelector('#entity-name').value;
    if (name === '') {
        document.querySelector('#entity-alert').style.display = 'block';
        return null;
    }

    if (!document.querySelector('#entity-bandwidth').validity.valid) {
        document.querySelector('#entity-bandwidth').reportValidity();
        return null;
    }

    let entity = {
        bandwidth: document.querySelector('#entity-bandwidth').value,
        entity_id: document.querySelector('#entity-id').value,
        entity: document.querySelector('#entity-name').value,
        node: "TBD",
        name: "TBD",
        //name: document.querySelector('#entity-name').value,
        peerings: [],
        tag: document.querySelector('#entity-vlans').value
    };

    let endpoints = JSON.parse(sessionStorage.getItem('endpoints'));
    let endpointIndex = document.querySelector('#entity-index').value;
    if (endpointIndex >= 0) {
        entity.peerings = endpoints[endpointIndex].peerings;
        endpoints[endpointIndex] = entity;
    } else {
        endpoints.push(entity);
    }

    sessionStorage.setItem('endpoints', JSON.stringify(endpoints));
    loadSelectedEndpointList();

    let addEndpointModal = $('#add-endpoint-modal');
    addEndpointModal.modal('hide');
}

async function addEntityCancelCallback(event) {
    let addEndpointModal = $('#add-endpoint-modal');
    addEndpointModal.modal('hide');
}

//--- Add Endpoint Modal

async function loadEntityList(parentEntity=null) {
    let entity = await getEntities(session.data.workgroup_id, parentEntity);
    let entitiesList = document.querySelector('#entities-list');

    let parent = null;
    if ('parents' in entity && entity.parents.length > 0) {
        parent = entity.parents[0];
    }

    let entities = '';

    entitiesList.innerHTML = '';
    if (parentEntity !== null) {
        entities += `<button type="button" class="list-group-item" onclick="loadEntityList(${parent.entity_id})">
                         ${parent.name}
                         <span class="glyphicon glyphicon-menu-left" style="float: right;"></span>
                     </button>`;
    }

    if ('children' in entity && entity.children.length > 0) {
        entity.children.forEach(function(child) {
                entities += `<button type="button" class="list-group-item" onclick="loadEntityList(${child.entity_id})">
                                 ${child.name}
                                 <span class="glyphicon glyphicon-menu-right" style="float: right;"></span>
                             </button>`;
        });

        entitiesList.innerHTML = entities;
    }

    setEntity(entity.entity_id, entity.name);

    let entityAlertOK = document.querySelector('#entity-alert-ok');
    entityAlertOK.innerHTML = `<p>Selected ${entity.name}.</p>`;
    entityAlertOK.style.display = 'block';
}



//--- Main - Schedule ---



function setDateTimeVisibility() {
  let type = document.querySelector('input[name=provision-time]:checked').value;
  let pick = document.getElementById('provision-time-picker');

  if (type === 'later') {
    pick.style.display = 'block';
  } else {
    pick.style.display = 'none';
  }

  type = document.querySelector('input[name=remove-time]:checked').value;
  pick = document.getElementById('remove-time-picker');

  if (type === 'later') {
    pick.style.display = 'block';
  } else {
    pick.style.display = 'none';
  }
}

//--- Main - Endpoint ---

function setIPv4ValidationMessage(input) {
    input.addEventListener('input', function(e) {
        if (input.validity.valueMissing) {
            input.setCustomValidity('Please fill out this field.');
        } else if (input.validity.patternMismatch) {
            input.setCustomValidity('Please input a valid IPv4 subnet in CIDR notation.');
        } else {
            input.setCustomValidity('');
        }
    }, false);
}

function newPeering(index) {
    let asn = document.querySelector(`#new-peering-form-${index} .bgp-asn`);
    if (!asn.validity.valid) {
        asn.reportValidity();
        return null;
    }
    let yourPeerIP = document.querySelector(`#new-peering-form-${index} .your-peer-ip`);
    if (!yourPeerIP.validity.valid) {
        yourPeerIP.reportValidity();
        return null;
    }
    let key = document.querySelector(`#new-peering-form-${index} .bgp-key`);
    if (!key.validity.valid) {
        key.reportValidity();
        return null;
    }
    let oessPeerIP = document.querySelector(`#new-peering-form-${index} .oess-peer-ip`);
    if (!oessPeerIP.validity.valid) {
        oessPeerIP.reportValidity();
        return null;
    }

    let peering = {
        asn: asn.value,
        key: key.value,
        oessPeerIP: oessPeerIP.value,
        yourPeerIP: yourPeerIP.value
    };

    let endpoints = JSON.parse(sessionStorage.getItem('endpoints'));
    endpoints[index].peerings.push(peering);
    sessionStorage.setItem('endpoints', JSON.stringify(endpoints));

    // Redraw endpoints
    loadSelectedEndpointList();
}

function deletePeering(endpointIndex, peeringIndex) {
    let endpoints = JSON.parse(sessionStorage.getItem('endpoints'));
    endpoints[endpointIndex].peerings.splice(peeringIndex, 1);
    sessionStorage.setItem('endpoints', JSON.stringify(endpoints));

    // Redraw endpoints
    loadSelectedEndpointList();
}

//--- Main ---

function loadSelectedEndpointList() {
  let endpoints = JSON.parse(sessionStorage.getItem('endpoints'));
  let selectedEndpointList = '';

  console.log(endpoints);
  endpoints.forEach(function(endpoint, index) {
          let endpointName = '';
          endpointName = `${endpoint.entity} - ${endpoint.node} - ${endpoint.name} <small>${endpoint.tag}</small>`;
         
          let peerings = '';
          endpoint.peerings.forEach(function(peering, peeringIndex) {
                  peerings += `
<tr>
  <td>${peering.asn}</td>
  <td>${peering.yourPeerIP}</td>
  <td>${peering.key}</td>
  <td>${peering.oessPeerIP}</td>
  <td><button class="btn btn-danger btn-sm" class="form-control" type="button" onclick="deletePeering(${index}, ${peeringIndex})">&nbsp;<span class="glyphicon glyphicon-trash"></span>&nbsp;</button></td>
</tr>
`;
          });

          let html = `
<div id="entity-${index}" class="panel panel-default">
  <div class="panel-heading">
    <h4 style="margin: 0px">
      ${endpointName}
      <span style="float: right; margin-top: -5px;">
        <button class="btn btn-link" type="button" onclick="modifyNetworkEndpointCallback(${index})"><span class="glyphicon glyphicon-edit"></span></button>
        <button class="btn btn-link" type="button" onclick="deleteNetworkEndpointCallback(${index})"><span class="glyphicon glyphicon-trash"></span></button>
      </span>
    </h4>
  </div>

  <div class="table-responsive">
    <div id="endpoints">
      <table class="table">
        <thead><tr><th>Your ASN</th><th>Your IP</th><th>Your BGP Key</th><th>OESS IP</th><th></th></tr></thead>
        <tbody>
          ${peerings}
          <tr id="new-peering-form-${index}">
               <td><input class="form-control bgp-asn" type="number" ${ endpoint.cloud_account_id ? 'disabled' : 'required' } /></td>
            <td><input class="form-control your-peer-ip" type="text" required /></td>
            <td><input class="form-control bgp-key" type="text" /></td>
            <td><input class="form-control oess-peer-ip" type="text" required /></td>
            <td><button class="btn btn-success btn-sm" class="form-control" type="button" onclick="newPeering(${index})">&nbsp;<span class="glyphicon glyphicon-plus"></span>&nbsp;</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
`;

          selectedEndpointList += html;
  });

  document.getElementById('selected-endpoint-list').innerHTML = selectedEndpointList;

  endpoints.forEach(function(endpoint, index) {
          let yourPeerIP = document.querySelector(`#new-peering-form-${index} .your-peer-ip`);
          asIPv4CIDR(yourPeerIP);

          let oessPeerIP = document.querySelector(`#new-peering-form-${index} .oess-peer-ip`);
          asIPv4CIDR(oessPeerIP);
  });
}
