//@flow
/**
* @Author: wansong
* @Date:   2016-06-20T17:43:29+08:00
* @Email:  betterofsong@gmail.com
*/

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  Text,
  View,
  ListView,
  TouchableWithoutFeedback,
  PixelRatio,
  ActivityIndicator,
} from 'react-native';
import _ from 'lodash';
import SwipeCell from 'react-native-swipeout';
import shallowCompare from 'react-addons-shallow-compare';
import Toast from 'react-native-root-toast';
import { SeparatorLine as ZKSeparatorLine } from 'zhike-mobile-components';

function CellRow(props) {
  return (
    <View
      style={[{ alignSelf:'stretch' }, props.style]}
    >
      {props.children}
    </View>
  );
}

export default class ZKListView extends Component {
  static propTypes = {
    // [{rows:array, sectionInfo:object}]
    dataSource: PropTypes.arrayOf(
      PropTypes.shape({
        sectionInfo: PropTypes.object,
        rows: PropTypes.arrayOf(
          PropTypes.shape({
            component: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
          })
        )
      })
    ),
    numberOfCellsPerRow: PropTypes.number,
    onTapRow: PropTypes.func,
    renderSeparator: PropTypes.func,
    alwaysRenderSeparator: PropTypes.bool,
    // eslint-disable-next-line
    separatorStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),

    hideSection: PropTypes.bool,
    // eslint-disable-next-line
    sectionStyle: PropTypes.object,
    // eslint-disable-next-line
    sectionWrapperStyle: PropTypes.object,

    renderHeader:PropTypes.func,
    editable: PropTypes.bool,
    onDeleteRow: PropTypes.func,
  }

  static defaultProps = {
    numberOfCellsPerRow: 1,
  }

  constructor(props) {
    super(props);
    this.state = {
      dataSource:props.dataSource || [],
    };
    this.state.convertedDataSource = this._convertedDataSource(this.state.dataSource);

    this._renderRow = this._renderRow.bind(this);
    this._renderSectionHeader = this._renderSectionHeader.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      dataSource:nextProps.dataSource || [],
      convertedDataSource: this._convertedDataSource(nextProps.dataSource || []),
    });
  }

  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  }

  _convertedDataSource(dataSource) {
    return dataSource.map(
      aSec => ({
        sectionInfo: aSec.sectionInfo,
        rows: this._convertedRows(aSec.rows),
      })
    );
  }

  _convertedRows(rows) {
    const ret = [];
    for (let i = 0; i < rows.length; i += this.props.numberOfCellsPerRow) {
      if (i + this.props.numberOfCellsPerRow <= rows.length) {
        ret.push(_.range(i, i + this.props.numberOfCellsPerRow));
      } else {
        ret.push(_.range(i, rows.length));
      }
    }
    return ret;
  }

  _getDataSource() {
    const dataSource = new ListView.DataSource({
      rowHasChanged: (r1, r2) => {
        if (_.isEmpty(r1) && _.isEmpty(r2)) {
          return false;
        }
        for (let i = 0; i < r1.length; i++) {
          if (r1[i] !== r2[i]) {
            return true;
          }
        }
        return false;
      },
      sectionHeaderHasChanged : (s1, s2) => s1 !== s2,
      getSectionHeaderData: (dataBlob, sectionId) => {
        const secInfo = this.state.dataSource[sectionId].sectionInfo;
        return secInfo ? secInfo.name : undefined;
      },
      getRowData: (dataBlob, sectionId, rowId) =>
         this.state.convertedDataSource[sectionId].rows[rowId]
    });
    const dataSourceArray = this.state.convertedDataSource || [];
    const secIds = _.range(dataSourceArray.length);
    const rowIds = secIds.map(
      index => (
        dataSourceArray &&
        dataSourceArray[index] &&
        Array.isArray(dataSourceArray[index].rows) &&
        _.range(dataSourceArray[index].rows.length)
      )
    );
    return dataSource.cloneWithRowsAndSections({}, secIds, rowIds);
  }

  _otherProps() {
    const {
      dataSource, // eslint-disable-line
      renderSeparator, // eslint-disable-line
      hideSection, // eslint-disable-line
      sectionWrapperStyle, // eslint-disable-line
      sectionStyle, // eslint-disable-line
      onTapRow, // eslint-disable-line
      ...other
    } = this.props;
    return other;
  }

  scrollTo(...args) {
    this._listView &&
    typeof this._listView.scrollTo === 'function' &&
    this._listView.scrollTo(...args);
  }


  _renderSectionHeader(sectionData, sectionId) {
    return (
      <View style={[styles.sectionWrapper, this.props.sectionWrapperStyle]}>
        <Text style={this.props.sectionStyle} >{sectionData}</Text>
      </View>
    );
  }

  _renderRow(rowData, secId, rowId) {
    const rowContent = this._renderRowIntern(rowData, secId, rowId);
    const cellContainerStyle = this.props.cellContainerStyle;

    if (this.props.editable && this.props.numberOfCellsPerRow === 1) {
      return (
        <SwipeCell
          autoClose={true}
          close={!this.state.dataSource[secId].rows[rowId].opened}
          onOpen={() => {
            this.state.dataSource.forEach((section, sId) => {
              section.rows.forEach((row, rId) => {
                this.state.dataSource[secId].rows[rowId].opened = secId === sId && rowId === rId;
              });
            });
            this.forceUpdate();
          }}
          right={[
            {
              text:'删除',
              backgroundColor:'#ff0000',
              color:'#ffffff',
              onPress:() => {
                console.log('deleted secId, rowId', secId, rowId);
                this.props.onDeleteRow && this.props.onDeleteRow(secId, rowId);
              },
            }
          ]}
        >
          <CellRow
            style={cellContainerStyle}
          >
            {rowContent}
          </CellRow>
        </SwipeCell>
      );
    } else {
      return (
        <CellRow
          style={cellContainerStyle}
        >
          {rowContent}
        </CellRow>
      );
    }
  }

  _renderRowIntern(rowData_, secId, rowId) {
    const rowData = [...rowData_];
    for (let i = 0; i < this.props.numberOfCellsPerRow - rowData.length; i++) {
      rowData.push('placeholder');
    }
    return rowData.map(
      (index, ii) => {
        if (index === 'placeholder') {
          return (
            <View
              key={`${secId}-${rowId}-${ii}`}
              style={{ flex:1, alignSelf:'stretch' }}
              opacity={0}
            />
          );
        }
        const cellData = this.state.dataSource[secId].rows[index];
        const { component, ...otherProp } = cellData;
        if (!otherProp.onPress) {
          otherProp.onPress = () => {
            if (this.props && this.props.onTapRow) {
              this.props.onTapRow(secId, index);
            }
          };
        }
        otherProp.key = `${secId}-${rowId}-${index}`;
        return React.createElement(cellData.component, otherProp);
      }
    );
  }

  render() {
    const other = this._otherProps();
    return (
      <ListView
        ref={(listView) => { this._listView = listView; }}
        scrollEventThrottle={16}
        style={[styles.container, this.props.style]}
        dataSource={this._getDataSource()}
        renderRow={this._renderRow}
        renderSeparator={
          (secId, rowId) =>
             (
              (!this.props.alwaysRenderSeparator &&
                this.state.dataSource &&
                this.state.dataSource[secId] &&
                this.state.dataSource[secId].rows &&
                this.state.dataSource[secId].rows.length === rowId + 1) ?
              null : (this.props.renderSeparator ? this.props.renderSeparator(secId, rowId) :  <ZKSeparatorLine
                key={`sep: ${secId} - ${rowId}`}
                lineStyle={[{ marginLeft:12, height: 1.0 / PixelRatio.get() }, this.props.separatorStyle]}
              />)
            )
        }
        renderHeader={this.props.renderHeader}
        renderSectionHeader={
          this.props.hideSection ? null : this._renderSectionHeader
        }
        enableEmptySections
        {...other}
      />
    );
  }
}

let styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionWrapper: {
    justifyContent: 'center',
  },
});
